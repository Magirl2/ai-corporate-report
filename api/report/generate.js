import jwt from 'jsonwebtoken';
import { parse } from 'cookie';
import { getNormalizedUser, incrementUserUsage, getCachedReport, setCachedReport } from '../_lib/db.js';
import { ServerOrchestrator } from '../_lib/orchestrator.js';
import { createLogger } from '../_lib/logger.js';
import { ErrorCategory, createErrorResponse, createStreamError } from '../_lib/errors.js';

const JWT_SECRET = process.env.JWT_SECRET || 'ei_mock_secret_key_123';

export const maxDuration = 60; // 60초 설정

export default async function handler(req, res) {
  const logger = createLogger('/api/report/generate');
  
  if (req.method !== 'POST') {
    logger.warn('Method not allowed');
    return res.status(405).json(createErrorResponse(ErrorCategory.VALIDATION, 'METHOD_NOT_ALLOWED', 'Method Not Allowed', logger.reqId, false));
  }

  // 1. 세션 확인
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

  // 2. 권한/사용량 체크
  // 관리자(admin)는 모든 제한을 우회합니다.
  const isAdmin = user.role === 'admin';
  if (!isAdmin && user.plan !== 'premium' && user.usage >= 3) {
    return res.status(403).json(createErrorResponse(ErrorCategory.USAGE, 'QUOTA_EXCEEDED', '무료 분석 한도를 모두 사용했습니다. 플랜을 업그레이드하세요.', logger.reqId, false));
  }

  const { companyName, forceRefresh } = req.body;
  if (!companyName) {
    logger.warn('Missing companyName');
    return res.status(400).json(createErrorResponse(ErrorCategory.VALIDATION, 'BAD_REQUEST', '기업명이 필요합니다.', logger.reqId, false));
  }

  logger.info('Generate report request start', { companyName, userEmail: user.email });

  // 3. 스트리밍 응답 헤더 설정 (NDJSON)
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendUpdate = (data) => {
    res.write(JSON.stringify(data) + '\n');
  };

  try {
    // 3.5 캐시 히트 검사 (Single-Report 전용)
    if (!forceRefresh) {
      const cachedResult = await getCachedReport(companyName);
      if (cachedResult) {
        logger.info('Cache hit', { companyName, stage: 'cache_check' });
        sendUpdate({ type: 'status', data: { message: '최근 생성된 캐시 보고서를 불러오는 중...' }});
        
        // 캐시 히트라도 과금/사용량 차감 등 비즈니스 제약은 정상적으로 적용
        await incrementUserUsage(user.email);
        
        sendUpdate({ type: 'success', data: cachedResult });
        res.end();
        logger.info('Generate report success (cached)', { companyName });
        return;
      }
    } else {
      logger.info('Force refresh requested, bypassing cache', { companyName });
    }

    logger.info('Cache miss, starting orchestrator', { companyName, stage: 'orchestration' });

    // 4. 오케스트레이터 기동
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host;
    const baseUrl = `${protocol}://${host}`;

    const orchestrator = new ServerOrchestrator(companyName, (status) => {
      sendUpdate({ type: 'status', data: { message: status } });
    }, baseUrl, logger);

    const finalReport = await orchestrator.run();

    // 5. 사용량 차감 (성공 시에만)
    await incrementUserUsage(user.email);

    // 5.5 새롭게 생성된 리포트 캐시 저장
    await setCachedReport(companyName, finalReport);

    // 6. 최종 결과 전송
    sendUpdate({ type: 'success', data: finalReport });
    res.end();
    logger.info('Generate report success', { companyName });

  } catch (err) {
    logger.error('Generate report failed', { companyName, error: err.message, stack: err.stack, code: err.code });
    sendUpdate(createStreamError(ErrorCategory.INTERNAL, 'INTERNAL_ERROR', err.message || '보고서 생성 중 알 수 없는 에러가 발생했습니다.', logger.reqId, true));
    res.end();
  }
}
