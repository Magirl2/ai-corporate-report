import jwt from 'jsonwebtoken';
import { parse } from 'cookie';
import { findUserByEmail, updateUser, toSafeUser } from '../../db.js';
import { createErrorResponse, ErrorCategory } from '../../errors.js';

const JWT_SECRET = process.env.JWT_SECRET || 'ei_mock_secret_key_123';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json(createErrorResponse(ErrorCategory.VALIDATION, 'METHOD_NOT_ALLOWED', 'Method Not Allowed'));
  }

  try {
    const cookies = parse(req.headers.cookie || '');
    const token = cookies.ei_session;
    if (!token) {
      return res.status(401).json(createErrorResponse(ErrorCategory.AUTH, 'AUTH_REQUIRED', '인증되지 않은 사용자입니다.'));
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const dbUser = await findUserByEmail(decoded.email);
    if (!dbUser) {
      return res.status(401).json(createErrorResponse(ErrorCategory.AUTH, 'USER_NOT_FOUND', '사용자를 찾을 수 없습니다.'));
    }

    const { planType } = req.body;
    if (!planType) {
      return res.status(400).json(createErrorResponse(ErrorCategory.VALIDATION, 'INVALID_PLAN', '잘못된 플랜 타입입니다.'));
    }

    // 가짜 결제 딜레이 처리
    await new Promise(resolve => setTimeout(resolve, 1500));

    // 유저 플랜 업데이트
    const updatedUser = await updateUser(dbUser.email, { plan: planType });

    return res.status(200).json({ user: toSafeUser(updatedUser) });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json(createErrorResponse(ErrorCategory.AUTH, 'SESSION_EXPIRED', '세션이 만료되었습니다.'));
    }
    return res.status(500).json(createErrorResponse(ErrorCategory.INTERNAL, 'SERVER_ERROR', '서버 에러가 발생했습니다.'));
  }
}
