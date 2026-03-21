// api/dart-finance.js
import { inflateRawSync } from 'zlib';

// 모듈 수준 캐시 — Vercel 인스턴스가 살아있는 동안 재사용됨
let corpCodeCache = null; // Map<corpName, corpCode>
let corpCodeCachedAt = 0;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24시간

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const DART_API_KEY = process.env.DART_API_KEY;

  try {
    const queryString = req.url.split('?')[1] || '';
    const searchParams = new URLSearchParams(queryString);
    const corpName = searchParams.get('corp_name');

    if (!corpName) {
      return res.status(400).json({ error: 'corp_name 파라미터가 필요합니다.' });
    }

    // ─── STEP 1: corpCode.xml(ZIP)로 corp_code 조회 (캐시 활용) ────────
    if (!corpCodeCache || Date.now() - corpCodeCachedAt > CACHE_TTL_MS) {
      const zipRes = await fetch(
        `https://opendart.fss.or.kr/api/corpCode.xml?crtfc_key=${DART_API_KEY}`,
        { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CorporateReportBot/1.0)' } }
      );
      if (!zipRes.ok) {
        return res.status(502).json({ error: 'DART 기업코드 조회에 실패했습니다.' });
      }
      const zipBuffer = Buffer.from(await zipRes.arrayBuffer());
      corpCodeCache = buildCorpCodeMap(zipBuffer);
      corpCodeCachedAt = Date.now();
    }

    // 캐시에서 corp_code 조회
    const corpCode = corpCodeCache.get(corpName)
      || [...corpCodeCache.entries()].find(([k]) => k.includes(corpName))?.[1]
      || null;

    if (!corpCode) {
      return res.status(404).json({ error: `'${corpName}'에 해당하는 기업을 찾을 수 없습니다.` });
    }

    // ─── STEP 2: 최근 4개 연도 재무제표 병렬 조회 ───────────────────────
    const currentYear = new Date().getFullYear();
    const years = [currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4];

    const fetchYear = async (year) => {
      const url = `https://opendart.fss.or.kr/api/fnlttSinglAcntAll.json` +
        `?crtfc_key=${DART_API_KEY}` +
        `&corp_code=${corpCode}` +
        `&bsns_year=${year}` +
        `&reprt_code=11011` +
        `&fs_div=CFS`;

      const r = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CorporateReportBot/1.0)' }
      });
      const data = await r.json();

      if (data.status !== '000' || !data.list?.length) {
        const fallback = await fetch(url.replace('fs_div=CFS', 'fs_div=OFS'), {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CorporateReportBot/1.0)' }
        });
        const fallbackData = await fallback.json();
        return { year, list: fallbackData.list || [] };
      }
      return { year, list: data.list };
    };

    const results = await Promise.all(years.map(fetchYear));

    // ─── STEP 3: 연도별 원시 수치 추출 ──────────────────────────────────
    const rawByYear = {};
    for (const { year, list } of results) {
      const find = (nm) => list.find(r => r.account_nm === nm);
      const toNum = (str) => parseInt((str || '0').replace(/,/g, ''), 10);

      rawByYear[year] = {
        revenue:     toNum(find('매출액')?.thstrm_amount),
        opIncome:    toNum(find('영업이익')?.thstrm_amount),
        netInc:      toNum(find('당기순이익')?.thstrm_amount),
        equity:      toNum(find('자본총계')?.thstrm_amount),
        liab:        toNum(find('부채총계')?.thstrm_amount),
        revenueRaw:  find('매출액')?.thstrm_amount    || '-',
        opIncomeRaw: find('영업이익')?.thstrm_amount  || '-',
        netIncRaw:   find('당기순이익')?.thstrm_amount || '-',
        equityRaw:   find('자본총계')?.thstrm_amount  || '-',
        liabRaw:     find('부채총계')?.thstrm_amount  || '-',
      };
    }

    // ─── STEP 4: 표시용 3개 연도 지표 계산 ───────────────────────────────
    const displayYears = years.slice(0, 3);
    const yearlyMetrics = displayYears.map((year) => {
      const cur  = rawByYear[year]     || {};
      const prev = rawByYear[year - 1] || {};

      const pct = (v, base) =>
        base !== 0 ? `${((v - base) / Math.abs(base) * 100).toFixed(1)}%` : null;

      return {
        year,
        revenueGrowth:   prev.revenue ? pct(cur.revenue, prev.revenue) : null,
        operatingMargin: cur.revenue  ? `${(cur.opIncome / cur.revenue * 100).toFixed(1)}%` : null,
        roe:             cur.equity   ? `${(cur.netInc   / cur.equity  * 100).toFixed(1)}%` : null,
        debtRatio:       cur.equity   ? `${(cur.liab     / cur.equity  * 100).toFixed(1)}%` : null,
        raw: {
          revenue:  cur.revenueRaw,
          opIncome: cur.opIncomeRaw,
          netIncome: cur.netIncRaw,
          equity:   cur.equityRaw,
          liab:     cur.liabRaw,
        }
      };
    });

    return res.status(200).json({
      corpName,
      bsnsYear: String(displayYears[0]),
      keyMetrics: {
        revenueGrowth:   yearlyMetrics[0].revenueGrowth,
        operatingMargin: yearlyMetrics[0].operatingMargin,
        roe:             yearlyMetrics[0].roe,
        debtRatio:       yearlyMetrics[0].debtRatio,
      },
      raw: yearlyMetrics[0].raw,
      yearlyMetrics,
    });

  } catch (error) {
    console.error('DART finance proxy error:', error);
    return res.status(500).json({ error: '서버 내부 오류가 발생했습니다.', details: error.message });
  }
}

// ─── ZIP 전체를 파싱해서 Map<corp_name, corp_code> 반환 ──────────────────────
function buildCorpCodeMap(buf) {
  const map = new Map();
  let offset = 0;

  while (offset < buf.length - 4) {
    if (buf.readUInt32LE(offset) !== 0x04034b50) { offset++; continue; }

    const compression  = buf.readUInt16LE(offset + 8);
    const compressedSz = buf.readUInt32LE(offset + 18);
    const fileNameLen  = buf.readUInt16LE(offset + 26);
    const extraLen     = buf.readUInt16LE(offset + 28);
    const dataOffset   = offset + 30 + fileNameLen + extraLen;
    const compressed   = buf.slice(dataOffset, dataOffset + compressedSz);

    let xml;
    try {
      xml = (compression === 0 ? compressed : inflateRawSync(compressed)).toString('utf-8');
    } catch {
      offset = dataOffset + compressedSz;
      continue;
    }

    // <list> 블록마다 corp_code / corp_name 추출해서 Map에 저장
    const pattern = /<corp_code>([^<]+)<\/corp_code>\s*<corp_name>([^<]+)<\/corp_name>/gi;
    let m;
    while ((m = pattern.exec(xml)) !== null) {
      map.set(m[2].trim(), m[1].trim());
    }
    break;
  }

  return map;
}