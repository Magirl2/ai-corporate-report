import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';
import bcrypt from 'bcryptjs';
import { createUser, findUserByEmail, toSafeUser } from '../../db.js';
import { createErrorResponse, ErrorCategory } from '../../errors.js';

const JWT_SECRET = process.env.JWT_SECRET || 'ei_mock_secret_key_123';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json(createErrorResponse(ErrorCategory.VALIDATION, 'METHOD_NOT_ALLOWED', 'Method Not Allowed'));
  }

  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json(createErrorResponse(ErrorCategory.VALIDATION, 'MISSING_FIELDS', '필수 입력 정보가 누락되었습니다.'));
    }

    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json(createErrorResponse(ErrorCategory.VALIDATION, 'USER_ALREADY_EXISTS', '이미 등록된 이메일입니다.'));
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

    const dbUser = await createUser(newUserRecord);

    // JWT 페이로드에서 비밀번호 포함, 가변 정보(usage, plan)까지 제거
    const userPayload = {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name
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
    return res.status(200).json({ user: toSafeUser(dbUser) });
  } catch (err) {
    return res.status(500).json({ error: '서버 에러가 발생했습니다.', details: err.message });
  }
}
