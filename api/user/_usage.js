import jwt from 'jsonwebtoken';
import { parse } from 'cookie';
import { getNormalizedUser, toSafeUser } from '../_lib/db.js';

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
    // 일일 초기화가 반영된 유저 정보를 가져옵니다.
    const dbUser = await getNormalizedUser(decoded.email);
    
    if (!dbUser) {
      return res.status(401).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    const { action } = req.body; // 'search' or 'compare'
    const isAdmin = dbUser.role === 'admin';

    if (action === 'compare') {
      if (!isAdmin && dbUser.plan !== 'premium') {
        return res.status(403).json({ error: '기업 비교 분석은 프리미엄 전용 기능입니다.' });
      }
      return res.status(200).json({ allowed: true, user: toSafeUser(dbUser) });
    }

    if (action === 'search') {
      // 관리자나 프리미엄이면 무조건 허용, 무료 사용자는 일일 3회 제한
      if (!isAdmin && dbUser.plan !== 'premium' && dbUser.usage >= 3) {
        return res.status(403).json({ error: '오늘의 무료 분석 횟수를 모두 사용했습니다.' });
      }
      
      // /api/report/generate 에서만 최종 차감하도록 단일화하여 중복 과금 방지
      return res.status(200).json({ allowed: true, user: toSafeUser(dbUser) });
    }

    return res.status(400).json({ error: '알 수 없는 액션입니다.' });

  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: '세션이 만료되었습니다.' });
    }
    return res.status(500).json({ error: '서버 에러가 발생했습니다.', details: err.message });
  }
}
