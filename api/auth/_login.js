import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';
import bcrypt from 'bcryptjs';
import { findUserByEmail, toSafeUser } from '../_lib/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'ei_mock_secret_key_123';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: '이메일과 비밀번호를 입력해주세요.' });
    }

    const userRecord = await findUserByEmail(email);
    if (!userRecord) {
      return res.status(400).json({ error: '이메일 혹은 비밀번호가 일치하지 않습니다.' });
    }

    // 데이터베이스에 저장된 암호 해시와 평문 암호 대조
    const isMatch = bcrypt.compareSync(password, userRecord.password);
    if (!isMatch) {
      return res.status(400).json({ error: '이메일 혹은 비밀번호가 일치하지 않습니다.' });
    }

    // JWT 페이로드에서 비밀번호 포함, 가변 정보(usage, plan)까지 제거
    const userPayload = {
      id: userRecord.id,
      email: userRecord.email,
      name: userRecord.name
    };

    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '7d' });

    res.setHeader('Set-Cookie', serialize('ei_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60
    }));

    // 공통 헬퍼를 사용하여 일관된 유저 정보 반환
    return res.status(200).json({ user: toSafeUser(userRecord) });
  } catch (err) {
    return res.status(500).json({ error: '서버 에러가 발생했습니다.', details: err.message });
  }
}
