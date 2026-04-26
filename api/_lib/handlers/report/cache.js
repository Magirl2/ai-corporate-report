import jwt from 'jsonwebtoken';
import { parse } from 'cookie';
import { getNormalizedUser, deleteCachedReport } from '../../db.js';
import { createErrorResponse, ErrorCategory } from '../../errors.js';
import { createLogger } from '../../logger.js';

const JWT_SECRET = process.env.JWT_SECRET || 'ei_mock_secret_key_123';

export default async function handler(req, res) {
  const logger = createLogger('/api/report/cache');

  if (req.method !== 'DELETE' && req.method !== 'POST') {
    return res.status(405).json(createErrorResponse(ErrorCategory.VALIDATION, 'METHOD_NOT_ALLOWED', 'Method Not Allowed', logger.reqId, false));
  }

  // 세션 확인
  const cookies = parse(req.headers.cookie || '');
  const token = cookies.ei_session;
  if (!token) return res.status(401).json(createErrorResponse(ErrorCategory.AUTH, 'UNAUTHORIZED', '인증되지 않은 사용자입니다.', logger.reqId, false));

  let user;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    user = await getNormalizedUser(decoded.email);
  } catch (_err) {
    return res.status(401).json(createErrorResponse(ErrorCategory.AUTH, 'INVALID_SESSION', '유효하지 않은 세션입니다.', logger.reqId, false));
  }

  if (!user) return res.status(401).json(createErrorResponse(ErrorCategory.AUTH, 'USER_NOT_FOUND', '사용자를 찾을 수 없습니다.', logger.reqId, false));

  const { companyName } = req.body;
  if (!companyName) {
    return res.status(400).json(createErrorResponse(ErrorCategory.VALIDATION, 'BAD_REQUEST', '기업명이 필요합니다.', logger.reqId, false));
  }

  try {
    await deleteCachedReport(companyName);
    logger.info(`Report cache deleted`, { companyName, userEmail: user.email });
    return res.status(200).json({ success: true, message: `'${companyName}' 캐시가 삭제되었습니다.` });
  } catch (err) {
    logger.error('Failed to delete cache', { error: err.message });
    return res.status(500).json(createErrorResponse(ErrorCategory.INTERNAL, 'INTERNAL_ERROR', '캐시 삭제 중 오류가 발생했습니다.', logger.reqId, false));
  }
}
