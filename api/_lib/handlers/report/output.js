import jwt from 'jsonwebtoken';
import { parse } from 'cookie';
import { 
  getNormalizedUser, 
  incrementUserUsage, 
  setCachedReport,
  getUniqueStage1Artifact
} from '../../db.js';
import { ServerOrchestrator } from '../../orchestrator.js';
import { createLogger } from '../../logger.js';
import { ErrorCategory, createErrorResponse, createStreamError } from '../../errors.js';

const JWT_SECRET = process.env.JWT_SECRET || 'ei_mock_secret_key_123';

export const maxDuration = 60; // 60초 설정

export default async function handler(req, res) {
  const logger = createLogger('/api/report/output');
  
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

  const { stage1Id } = req.body;
  if (!stage1Id) {
    logger.warn('Missing stage1Id');
    return res.status(400).json(createErrorResponse(ErrorCategory.VALIDATION, 'BAD_REQUEST', 'stage1Id가 필요합니다.', logger.reqId, false));
  }

  logger.info('Generate report output stage start', { stage1Id, userEmail: user.email });

  // 2. 스트리밍 응답 헤더 설정 (NDJSON)
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendUpdate = (data) => {
    res.write(JSON.stringify(data) + '\n');
  };

  try {
    // 3. Stage 1 데이터 불러오기
    logger.info('Loading Stage 1 artifact for Stage 2', { stage1Id });
    const loadedArtifact = await getUniqueStage1Artifact(stage1Id);
    
    if (!loadedArtifact) {
      throw new Error('Stage 1 artifact persistence failed - could not reload data for analysis.');
    }

    if (loadedArtifact.ownerEmail !== user.email) {
      logger.warn('Artifact owner mismatch', { ownerEmail: loadedArtifact.ownerEmail, userEmail: user.email });
      throw new Error('Artifact owner mismatch. You do not have permission to access this data.');
    }

    const companyName = loadedArtifact.companyName;
    const qualityMode = loadedArtifact.qualityMode || 'deep';

    // 4. 오케스트레이터 기동 (Stage 2 Analysis Only)
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host;
    const baseUrl = `${protocol}://${host}`;

    const orchestrator = new ServerOrchestrator(companyName, (status) => {
      sendUpdate({ type: 'status', data: { message: status } });
    }, baseUrl, logger);
    
    // QualityMode 주입
    if (orchestrator.setOptions) {
      orchestrator.setOptions({ qualityMode });
    }

    const finalReport = await orchestrator.runStage2Analysis(loadedArtifact.data);
    logger.info('Orchestration Stage 2 completed successfully', { 
      totalDurationMs: finalReport.metadata?.totalDurationMs,
      qualityLevel: finalReport.metadata?.qualityLevel 
    });

    // 5. 사용량 차감 (성공 시에만)
    await incrementUserUsage(user.email);

    // 5.5 품질 게이트 검사 후 선택적 캐시 저장
    const isPartial = finalReport.debug?.isPartialResult === true;
    const hasAgentErrors = Array.isArray(finalReport.debug?.agentErrors) && finalReport.debug.agentErrors.length > 0;
    
    const r = finalReport.report || {};
    const markdownLen = (r.markdown || '').length;
    const sourcesCount = (finalReport.sources || []).length;
    
    // 분석 섹션 누락 여부 (financial, strategy, news 중 2개 이상 없으면 경고)
    const missingAnalysisSections = [
      !r.financialAnalysis?.overview,
      !r.macroTrend,
      !r.marketSentiment,
    ].filter(Boolean).length;

    const qualityWarning =
      markdownLen < 1500 ||             // 마크다운 1500자 미만
      sourcesCount === 0 ||              // 출처 없음
      missingAnalysisSections >= 2;     // 주요 섹션 2개 이상 누락

    if (!isPartial && !hasAgentErrors && !qualityWarning) {
      await setCachedReport(companyName, finalReport);
      logger.info('Report cached (high quality)', { companyName, markdownLen, sourcesCount });
    } else {
      logger.warn('Report not cached due to quality gate failure', {
        companyName,
        isPartial,
        hasAgentErrors,
        qualityWarning,
        markdownLen,
        sourcesCount,
        missingAnalysisSections
      });
      if (!finalReport.metadata) finalReport.metadata = {};
      finalReport.metadata.qualityWarning = true;
    }

    // 캐시 상태 플래그 (새 분석이므로 항상 false)
    if (!finalReport.metadata) finalReport.metadata = {};
    finalReport.metadata.cacheHit = false;

    // 6. 최종 결과 전송
    sendUpdate({ type: 'success', data: finalReport });
    res.end();
    logger.info('Generate report output stage success', { companyName });

  } catch (err) {
    logger.error('Generate report output stage failed', { stage1Id, error: err.message, stack: err.stack, code: err.code });
    sendUpdate(createStreamError(ErrorCategory.INTERNAL, 'INTERNAL_ERROR', err.message || '보고서 출력 중 알 수 없는 에러가 발생했습니다.', logger.reqId, true));
    res.end();
  }
}
