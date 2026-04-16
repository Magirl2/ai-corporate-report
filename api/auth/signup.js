import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';
import bcrypt from 'bcryptjs';
import { createUser, findUserByEmail } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'ei_mock_secret_key_123';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { email, password, name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: '이메일과 비밀번호를 입력해주세요.' });
    }

    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: '이미 가입된 이메일입니다.' });
    }

    // 평문 비밀번호를 안전하게 암호화 (Salt Round: 10)
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    // 새 사용자 정보 생성 및 백엔드 스토리지 저장 (Vercel KV 지원)
    const newUserRecord = {
      id: Date.now().toString(),
      email,
      password: hashedPassword, // 평문 비밀번호가 아닌 해시 스토리지 전용 값
      name: name || email.split('@')[0],
      plan: 'free',
      usage: 0
    };

    await createUser(newUserRecord);

    // JWT 페이로드에서 비밀번호 포함, 가변 정보(usage, plan)까지 제거
    const userPayload = {
      id: newUserRecord.id,
      email: newUserRecord.email,
      name: newUserRecord.name
    };

    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '7d' });

    res.setHeader('Set-Cookie', serialize('ei_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60
    }));

    // 클라이언트 초기화를 위해 전체 레코드를 안전하게 전송
    const safeUserReturn = {
      id: newUserRecord.id,
      email: newUserRecord.email,
      name: newUserRecord.name,
      plan: newUserRecord.plan,
      usage: newUserRecord.usage
    };

    return res.status(200).json({ user: safeUserReturn });
  } catch (err) {
    return res.status(500).json({ error: '서버 에러가 발생했습니다.', details: err.message });
  }
}
