import jwt from 'jsonwebtoken';
import { parse } from 'cookie';
import { findUserByEmail, updateUser } from '../auth/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'ei_mock_secret_key_123';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const cookies = parse(req.headers.cookie || '');
    const token = cookies.ei_session;
    if (!token) {
      return res.status(401).json({ error: '인증되지 않은 사용자입니다.' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const dbUser = await findUserByEmail(decoded.email);
    if (!dbUser) {
      return res.status(401).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    const { planType } = req.body;
    if (!planType) {
      return res.status(400).json({ error: '잘못된 플랜 타입입니다.' });
    }

    // 가짜 결제 딜레이 처리 (프론트엔드에 있던 것)
    await new Promise(resolve => setTimeout(resolve, 1500));

    // 유저 플랜을 DB상에 직접 덮어쓰기
    const updatedUser = await updateUser(dbUser.email, { plan: planType });

    const safeUser = {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      plan: updatedUser.plan,
      usage: updatedUser.usage
    };

    return res.status(200).json({ user: safeUser });

  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: '세션이 만료되었습니다.' });
    }
    return res.status(500).json({ error: '서버 에러가 발생했습니다.', details: err.message });
  }
}
