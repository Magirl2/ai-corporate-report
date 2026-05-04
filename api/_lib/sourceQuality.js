// api/_lib/sourceQuality.js

export function getHostname(url) {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch (e) {
    return null;
  }
}

const DOMAIN_TIERS = {
  official: [
    'opendart.fss.or.kr', 'dart.fss.or.kr', 'kind.krx.co.kr', 'krx.co.kr',
    'sec.gov', 'investor.gov'
  ],
  global_finance: [
    'reuters.com', 'bloomberg.com', 'wsj.com', 'ft.com', 'cnbc.com',
    'marketwatch.com', 'barrons.com', 'apnews.com', 'businesswire.com', 'prnewswire.com'
  ],
  kr_finance: [
    'yna.co.kr', 'hankyung.com', 'mk.co.kr', 'sedaily.com', 'edaily.co.kr',
    'fnnews.com', 'biz.chosun.com', 'thebell.co.kr', 'infostockdaily.co.kr', 'news.einfomax.co.kr'
  ],
  finance_data: [
    'financialmodelingprep.com', 'finance.yahoo.com', 'companiesmarketcap.com',
    'macrotrends.net', 'nasdaq.com', 'nyse.com'
  ],
  blocked: [
    'tistory.com', 'blog.naver.com', 'cafe.naver.com', 'brunch.co.kr', 'medium.com',
    'reddit.com', 'quora.com', 'namu.wiki', 'wikipedia.org', 'youtube.com',
    'facebook.com', 'instagram.com', 'threads.net', 'x.com', 'twitter.com'
  ]
};

export function classifySourceType(url, title) {
  const hostname = getHostname(url);
  if (!hostname) return 'unknown';

  if (DOMAIN_TIERS.official.includes(hostname)) return 'official';
  if (DOMAIN_TIERS.global_finance.includes(hostname)) return 'global_finance';
  if (DOMAIN_TIERS.kr_finance.includes(hostname)) return 'kr_finance';
  if (DOMAIN_TIERS.finance_data.includes(hostname)) return 'finance_data';
  if (DOMAIN_TIERS.blocked.includes(hostname)) return 'blocked';

  if (url.includes('/investor') || url.includes('/ir') || url.includes('/earnings') || url.includes('/financial-results')) {
    return 'official_ir';
  }

  return 'general';
}

export function scoreSourceQuality(source) {
  let score = 50;
  const type = classifySourceType(source.url || source.uri, source.title);

  if (!source.url && !source.uri) return 10;

  switch (type) {
    case 'official': score = 98; break;
    case 'official_ir': score = 90; break;
    case 'global_finance': score = 85; break;
    case 'finance_data': score = 85; break;
    case 'kr_finance': score = 80; break;
    case 'general': score = 65; break;
    case 'blocked': score = 20; break;
    default: score = 40; break;
  }

  return score;
}

function getQualityTier(score) {
  if (score >= 85) return 'high';
  if (score >= 65) return 'medium';
  if (score >= 40) return 'low';
  return 'blocked';
}

export function normalizeSourceWithQuality(source, index = 0) {
  const url = source.url || source.uri || null;
  const hostname = getHostname(url);
  const score = scoreSourceQuality(source);
  const tier = getQualityTier(score);
  const type = classifySourceType(url, source.title);

  return {
    id: source.id || source.sourceId || `src-${index}`,
    type: type,
    title: source.title || source.headline || source.publisher || 'Unknown Source',
    publisher: source.publisher || hostname || 'Unknown',
    url: url,
    uri: url,
    hostname: hostname,
    publishedAt: source.publishedAt || source.date || source.sourceDate || null,
    accessedAt: new Date().toISOString(),
    reliability: tier === 'blocked' ? 'unverified' : 'verified',
    qualityScore: score,
    qualityTier: tier,
    usedIn: source.usedIn || [],
    note: type === 'global_finance' ? '원문 접근 제한 가능' : null,
    isPreferred: ['high', 'medium'].includes(tier) && type !== 'general',
    isBlocked: tier === 'blocked',
    blockReason: tier === 'blocked' ? '신뢰도 낮은 출처 (블로그/SNS/커뮤니티)' : null
  };
}

export function dedupeSourcesByUrl(sources) {
  const seen = new Set();
  return sources.filter(s => {
    const key = s.url || s.title;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function filterReportSources(sources, options = {}) {
  const deduped = dedupeSourcesByUrl(sources);
  return deduped.sort((a, b) => {
    // 1. 품질 점수 내림차순
    if (b.qualityScore !== a.qualityScore) return b.qualityScore - a.qualityScore;
    // 2. isPreferred 우선
    if (b.isPreferred && !a.isPreferred) return 1;
    if (a.isPreferred && !b.isPreferred) return -1;
    return 0;
  });
}
