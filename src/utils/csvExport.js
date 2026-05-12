/**
 * CSV 다운로드 유틸리티
 * - 화면에 표시된 재무 지표만 포함
 * - 개인정보, API key, 내부 캐시, secret 포함 금지
 */

function escapeCsvCell(value) {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCsvString(headers, rows) {
  const lines = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map(row => row.map(escapeCsvCell).join(',')),
  ];
  return '﻿' + lines.join('\r\n'); // UTF-8 BOM for Excel compatibility
}

export function downloadFinancialCsv(companyName, yearlyMetrics, currency) {
  if (!yearlyMetrics || yearlyMetrics.length === 0) return;

  const years = yearlyMetrics.map(y => String(y.year ?? '-'));
  const unitLabel = currency && currency !== 'KRW' ? `(${currency})` : '(원)';
  const headers = ['구분', ...years];

  const rows = [
    [`매출액 ${unitLabel}`, ...yearlyMetrics.map(y => y.raw?.revenue ?? '-')],
    [`영업이익 ${unitLabel}`, ...yearlyMetrics.map(y => y.raw?.opIncome ?? '-')],
    [`순이익 ${unitLabel}`, ...yearlyMetrics.map(y => y.raw?.netIncome ?? '-')],
    ['매출 성장률', ...yearlyMetrics.map(y => y.revenueGrowth ?? '-')],
    ['영업이익률', ...yearlyMetrics.map(y => y.operatingMargin ?? '-')],
    ['ROE', ...yearlyMetrics.map(y => y.roe ?? '-')],
    ['부채비율', ...yearlyMetrics.map(y => y.debtRatio ?? '-')],
  ];

  const csv = buildCsvString(headers, rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `${companyName}_재무지표_${dateStr}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
