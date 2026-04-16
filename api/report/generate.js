import jwt from 'jsonwebtoken';
import { parse } from 'cookie';
import { findUserByEmail, updateUser } from '../auth/db.js';
import { ServerOrchestrator } from '../_lib/orchestrator.js';

const JWT_SECRET = process.env.JWT_SECRET || 'ei_mock_secret_key_123';

export const maxDuration = 60; // 60초 설정

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'Method Not Allowed', retryable: false } });

  // 1. 세션 확인
  const cookies = parse(req.headers.cookie || '');
  const token = cookies.ei_session;
  if (!token) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: '인증되지 않은 사용자입니다.', retryable: false } });

  let user;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    user = await findUserByEmail(decoded.email);
  } catch (err) {
    return res.status(401).json({ success: false, error: { code: 'INVALID_SESSION', message: '유효하지 않은 세션입니다.', retryable: false } });
  }

  if (!user) return res.status(401).json({ success: false, error: { code: 'USER_NOT_FOUND', message: '사용자를 찾을 수 없습니다.', retryable: false } });

  // 2. 권한/사용량 체크
  if (user.plan !== 'premium' && user.usage >= 3) {
    return res.status(403).json({ success: false, error: { code: 'QUOTA_EXCEEDED', message: '무료 분석 한도를 모두 사용했습니다. 플랜을 업그레이드하세요.', retryable: false } });
  }

  const { companyName } = req.body;
  if (!companyName) return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: '기업명이 필요합니다.', retryable: false } });

  // 3. 스트리밍 응답 헤더 설정 (NDJSON)
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendUpdate = (data) => {
    res.write(JSON.stringify(data) + '\n');
  };

  try {
    // 4. 오케스트레이터 기동
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host;
    const baseUrl = `${protocol}://${host}`;

    const orchestrator = new ServerOrchestrator(companyName, (status) => {
      sendUpdate({ type: 'status', data: { message: status } });
    }, baseUrl);

    const finalReport = await orchestrator.run();

    // 5. 사용량 차감 (성공 시에만)
    await updateUser(user.email, { usage: user.usage + 1 });

    // 6. 최종 결과 전송
    sendUpdate({ type: 'success', data: finalReport });
    res.end();

  } catch (err) {
    console.error('[Generate Report] Error:', err);
    sendUpdate({ type: 'error', error: { code: 'INTERNAL_ERROR', message: err.message || '보고서 생성 중 알 수 없는 에러가 발생했습니다.', retryable: true } });
    res.end();
  }
}
