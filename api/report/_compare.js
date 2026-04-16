import jwt from 'jsonwebtoken';
import { parse } from 'cookie';
import { findUserByEmail, getCachedReport, setCachedReport } from '../_lib/db.js';
import { ServerOrchestrator } from '../_lib/orchestrator.js';
import { createLogger } from '../_lib/logger.js';
import { ErrorCategory, createErrorResponse, createStreamError } from '../_lib/errors.js';

const JWT_SECRET = process.env.JWT_SECRET || 'ei_mock_secret_key_123';

export const maxDuration = 60; // 60초 설정

    // 단위 테스트를 위한 순수 페이로드 조립 헬퍼
export const buildComparePayload = (dataA, dataB) => {
  return {
    type: 'success',
    data: { dataA, dataB }
  };
};

export default async function handler(req, res) {
  const logger = createLogger('/api/report/compare');

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
    user = await findUserByEmail(decoded.email);
  } catch (_err) {
    return res.status(401).json(createErrorResponse(ErrorCategory.AUTH, 'INVALID_SESSION', '유효하지 않은 세션입니다.', logger.reqId, false));
  }

  if (!user) return res.status(401).json(createErrorResponse(ErrorCategory.AUTH, 'USER_NOT_FOUND', '사용자를 찾을 수 없습니다.', logger.reqId, false));

  // 2. 권한 체크 (비교기능은 프리미엄 전용)
  if (user.plan !== 'premium') {
    return res.status(403).json(createErrorResponse(ErrorCategory.ENTITLEMENT, 'FORBIDDEN', '기업 비교 분석은 프리미엄 전용 기능입니다.', logger.reqId, false));
  }

  const { companyA, companyB } = req.body;
  if (!companyA || !companyB) {
    logger.warn('Missing company pair for comparison');
    return res.status(400).json(createErrorResponse(ErrorCategory.VALIDATION, 'BAD_REQUEST', '비교할 두 기업명이 모두 필요합니다.', logger.reqId, false));
  }

  logger.info('Compare report request start', { companyA, companyB, userEmail: user.email });

  // 3. 스트리밍 응답 헤더 설정 (NDJSON)
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendUpdate = (data) => {
    res.write(JSON.stringify(data) + '\n');
  };

  try {
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host;
    const baseUrl = `${protocol}://${host}`;

    // 개별 기업 데이터 처리 헬퍼 함수
    const processCompany = async (name) => {
      // 캐시 확인
      const cachedResult = await getCachedReport(name);
      if (cachedResult) {
        logger.info('Cache hit for compare company', { companyName: name, stage: 'cache_check' });
        sendUpdate({ type: 'status', data: { message: `[${name}] 캐시된 보고서 로드 완료` }});
        return cachedResult;
      }

      // 오케스트레이터 분석
      logger.info('Cache miss, starting orchestrator for compare company', { companyName: name, stage: 'orchestration' });
      sendUpdate({ type: 'status', data: { message: `[${name}] 신규 분석을 시작합니다...` }});
      const orchestrator = new ServerOrchestrator(name, (status) => {
        sendUpdate({ type: 'status', data: { message: `[${name}] ${status}` } });
      }, baseUrl, logger);

      const finalReport = await orchestrator.run();
      
      // 개별 결과 캐싱
      await setCachedReport(name, finalReport);
      
      return finalReport;
    };

    // 4. 병렬 처리로 성능 최적화 (단일 서버리스 환경에서 두 회사를 동시 처리)
    const [dataA, dataB] = await Promise.all([
      processCompany(companyA),
      processCompany(companyB)
    ]);

    // 5. 최종 결과 반환
    sendUpdate(buildComparePayload(dataA, dataB));
    res.end();
    logger.info('Compare report success', { companyA, companyB });

  } catch (err) {
    logger.error('Compare report failed', { companyA, companyB, error: err.message, stack: err.stack, code: err.code });
    sendUpdate(createStreamError(ErrorCategory.INTERNAL, 'INTERNAL_ERROR', err.message || '비교 분석 중 알 수 없는 에러가 발생했습니다.', logger.reqId, true));
    res.end();
  }
}
