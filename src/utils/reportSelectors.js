export const getYearlyMetrics = (data) => {
  return data?.financeData?.yearlyMetrics || data?.dartFinance?.yearlyMetrics || [];
};

export const getLatestMetrics = (data) => {
  const yearly = getYearlyMetrics(data);
  return yearly.length > 0 ? yearly[yearly.length - 1] : {};
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
