// api/dart.js — 기업 공시 목록 조회 (유사 기업명 자동 매칭)
import { resolveCorpCode, normalizeCorpName, extractKeyword } from '../../dart-utils.js';
import { getRequiredEnv } from '../../env.js';
import { createErrorResponse, ErrorCategory } from '../../errors.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  try {
    const DART_API_KEY = getRequiredEnv('DART_API_KEY');

    const queryString = req.url.split('?')[1] || '';
    const searchParams = new URLSearchParams(queryString);
    const corpName     = searchParams.get('corp_name') || '';
    const corpCodeParam = searchParams.get('corp_code') || '';
    const pageCount    = searchParams.get('page_count') || '5';

    if (!corpName && !corpCodeParam) {
      return res.status(400).json(createErrorResponse(ErrorCategory.VALIDATION, 'BAD_REQUEST', 'corp_name 또는 corp_code 파라미터가 필요합니다.'));
    }

    // ─── STEP 1: 통합 유틸리티를 통한 기업 코드 탐색 ────────────────────────────
    let resolvedCorpCode = corpCodeParam || null;
    let resolutionInfo = null;
    
    if (!resolvedCorpCode && corpName) {
      resolutionInfo = await resolveCorpCode(corpName, DART_API_KEY);
      resolvedCorpCode = resolutionInfo?.corpCode || null;
    } else if (resolvedCorpCode) {
      // corp_code가 직접 전달된 경우
      resolutionInfo = {
        corpCode: resolvedCorpCode,
        corpName: null,
        stockCode: null,
        method: 'direct'
      };
    }

    // ─── STEP 2: corpCode로 공시 목록 조회 ──────────────────────────────────
    const today = new Date();
    const fmt = (d) => d.toISOString().split('T')[0].replace(/-/g, '');

    let dartUrl;
    if (resolvedCorpCode) {
      // corp_code가 있으면 날짜 제한이 더 느슨하게 적용됨 → 6개월로 확장
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(today.getMonth() - 6);
      dartUrl =
        `https://opendart.fss.or.kr/api/list.json?crtfc_key=${DART_API_KEY}` +
        `&corp_code=${resolvedCorpCode}&bgn_de=${fmt(sixMonthsAgo)}&end_de=${fmt(today)}&page_count=${pageCount}`;
    } else {
      // corpCode를 못 찾은 경우 corp_name + 3개월로 폴백
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(today.getMonth() - 3);
      const spaced = normalizeCorpName(corpName, true);
      dartUrl =
        `https://opendart.fss.or.kr/api/list.json?crtfc_key=${DART_API_KEY}` +
        `&corp_name=${encodeURIComponent(spaced)}&bgn_de=${fmt(threeMonthsAgo)}&end_de=${fmt(today)}&page_count=${pageCount}`;
    }

    const response = await fetch(dartUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CorporateReportBot/1.0)', 'Accept': 'application/json' }
    });

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return res.status(502).json(createErrorResponse(ErrorCategory.UPSTREAM, 'DART_INVALID_RESPONSE', 'DART API가 유효하지 않은 응답을 반환했습니다.'));
    }

    const data = await response.json();

    // 매칭된 기업명과 실제 공시 기업명이 다를 수 있으므로 유사도 기준 필터링
    if (data.status === '000' && data.list) {
      if (resolvedCorpCode) {
        // corp_code로 조회 시 이미 정확하므로 필터 불필요
      } else {
        // corp_name 검색 시 유사 기업만 유지
        const normalized = normalizeCorpName(corpName);
        const keyword = extractKeyword(corpName);
        data.list = data.list.filter(item => {
          const n = normalizeCorpName(item.corp_name || '');
          return n === normalized || n.startsWith(keyword) || n.includes(keyword);
        });
        if (data.list.length === 0) {
          data.status = '013';
          data.message = `'${corpName}'의 최근 공시 정보가 없습니다.`;
        }
      }
    }

    // 응답에 메타데이터 포함
    return res.status(200).json({
      ...data,
      resolvedCorpCode: resolutionInfo?.corpCode || resolvedCorpCode,
      resolvedCorpName: resolutionInfo?.corpName || null,
      stockCode: resolutionInfo?.stockCode || null,
      resolutionMethod: resolutionInfo?.method || (corpCodeParam ? 'direct' : null)
    });

  } catch (error) {
    console.error('DART proxy error:', error);
    return res.status(500).json(createErrorResponse(ErrorCategory.INTERNAL, 'INTERNAL_ERROR', '서버 내부 오류가 발생했습니다.'));
  }
}