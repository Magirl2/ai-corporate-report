export const getYearlyMetrics = (data) => {
  return data?.financeData?.yearlyMetrics || data?.dartFinance?.yearlyMetrics || [];
};

export const getLatestMetrics = (data) => {
  const yearly = getYearlyMetrics(data);
  // yearlyMetrics는 내림차순(최신 연도 먼저)이므로 index 0이 최신 연도
  return yearly.length > 0 ? yearly[0] : {};
};

export const getSourceBadge = (data) => {
  if (data?.financeData) {
    const currency = data.financeData.raw?.currency;
    return currency && currency !== 'KRW' ? 'FMP · US' : 'DART · KR';
  }
  return 'AI REPORT';
};

export const getSafeItems = (items) => {
  return Array.isArray(items) ? items : (typeof items === 'string' ? [items] : []);
};
