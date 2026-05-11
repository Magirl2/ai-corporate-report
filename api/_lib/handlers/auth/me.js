import jwt from 'jsonwebtoken';
import { parse } from 'cookie';
import { getNormalizedUser, toSafeUser } from '../../db.js';
import { createErrorResponse, ErrorCategory } from '../../errors.js';
import { getJwtSecret } from '../../env.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json(createErrorResponse(ErrorCategory.VALIDATION, 'METHOD_NOT_ALLOWED', 'Method Not Allowed'));

  try {
    const cookies = parse(req.headers.cookie || '');
    const token = cookies.ei_session;

    if (!token) {
      return res.status(401).json(createErrorResponse(ErrorCategory.AUTH, 'UNAUTHORIZED', '인증되지 않은 사용자입니다.'));
    }

    const decoded = jwt.verify(token, getJwtSecret());

    // DB에서 실시간 유저 정보 조회 (플랜/사용량 동기화)
    const dbUser = await getNormalizedUser(decoded.email);

    if (!dbUser) {
      return res.status(401).json(createErrorResponse(ErrorCategory.AUTH, 'USER_NOT_FOUND', '사용자를 찾을 수 없습니다.'));
    }

    // 공통 헬퍼를 사용하여 일관된 유저 정보 반환
    return res.status(200).json({ user: toSafeUser(dbUser) });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json(createErrorResponse(ErrorCategory.AUTH, 'TOKEN_EXPIRED', '세션이 만료되었습니다.'));
    }
    return res.status(401).json(createErrorResponse(ErrorCategory.AUTH, 'INVALID_TOKEN', '유효하지 않은 토큰입니다.'));
  }
}

