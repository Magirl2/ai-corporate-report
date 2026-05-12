import React from 'react';
import { parseNumber, safeString, formatKRW, formatFMPValue } from '../utils/formatters';
import { buildDynamicSummary } from '../utils/compareHelpers';
import { getLatestMetrics, getYearlyMetrics, getSourceBadge } from '../utils/reportSelectors';

export default function CompareFinancials({ dataA, dataB }) {
  const metricA = getLatestMetrics(dataA);
  const metricB = getLatestMetrics(dataB);
  const yearlyA = getYearlyMetrics(dataA);
  const yearlyB = getYearlyMetrics(dataB);

  const sourceA = getSourceBadge(dataA);
  const sourceB = getSourceBadge(dataB);
  const isKrwA = sourceA !== 'FMP · US';
  const isKrwB = sourceB !== 'FMP · US';
  const currencyA = dataA?.financeData?.raw?.currency || 'KRW';
  const currencyB = dataB?.financeData?.raw?.currency || 'KRW';

  const latestYearA = yearlyA[0]?.year;
  const latestYearB = yearlyB[0]?.year;

  const rawRevA = metricA?.raw?.revenue;
  const rawRevB = metricB?.raw?.revenue;
  const rawOpA  = metricA?.raw?.opIncome;
  const rawOpB  = metricB?.raw?.opIncome;

  const numRevA = parseNumber(metricA.revenueGrowth);
  const numRevB = parseNumber(metricB.revenueGrowth);
  const numMarginA = parseNumber(metricA.operatingMargin);
  const numMarginB = parseNumber(metricB.operatingMargin);
  const numDebtA = parseNumber(metricA.debtRatio);
  const numDebtB = parseNumber(metricB.debtRatio);
  const numRoeA = parseNumber(metricA.roe);
  const numRoeB = parseNumber(metricB.roe);

  const dynamicSummary = buildDynamicSummary(dataA.companyName || '기업 A', dataB.companyName || '기업 B', metricA, metricB);

  const getWinnerClass = (valSelf, valOther, higherIsBetter = true) => {
    if (valSelf === null || valOther === null || valSelf === valOther) return 'text-slate-600';
    const isWinner = higherIsBetter ? valSelf > valOther : valSelf < valOther;
    return isWinner ? 'text-emerald-700 font-bold' : 'text-slate-500';
  };

  const WinnerBadge = ({ valSelf, valOther, higherIsBetter = true }) => {
    if (valSelf === null || valOther === null || valSelf === valOther) return null;
    const isWinner = higherIsBetter ? valSelf > valOther : valSelf < valOother;
    return isWinner
      ? <span className="ml-1 text-[9px] bg-emerald-100 text-emerald-700 rounded px-1 font-bold">WIN</span>
      : null;
  };

  const formatRaw = (rawStr, isKrw, currency) => {
    if (!rawStr || rawStr === '-') return '-';
    return isKrw ? formatKRW(rawStr) : `${formatFMPValue(rawStr)} ${currency}`;
  };

  const rows = [
    {
      label: '매출액',
      cellA: <>{formatRaw(rawRevA, isKrwA, currencyA)}</>,
      cellB: <>{formatRaw(rawRevB, isKrwB, currencyB)}</>,
      numA: parseNumber(rawRevA),
      numB: parseNumber(rawRevB),
      higherIsBetter: true,
    },
    {
      label: '영업이익',
      cellA: <>{formatRaw(rawOpA, isKrwA, currencyA)}</>,
      cellB: <>{formatRaw(rawOpB, isKrwB, currencyB)}</>,
      numA: parseNumber(rawOpA),
      numB: parseNumber(rawOpB),
      higherIsBetter: true,
    },
    {
      label: '매출 성장률',
      cellA: safeString(metricA.revenueGrowth),
      cellB: safeString(metricB.revenueGrowth),
      numA: numRevA,
      numB: numRevB,
      higherIsBetter: true,
    },
    {
      label: '영업 이익률',
      cellA: safeString(metricA.operatingMargin),
      cellB: safeString(metricB.operatingMargin),
      numA: numMarginA,
      numB: numMarginB,
      higherIsBetter: true,
    },
    {
      label: '부채비율',
      cellA: safeString(metricA.debtRatio),
      cellB: safeString(metricB.debtRatio),
      numA: numDebtA,
      numB: numDebtB,
      higherIsBetter: false,
    },
    {
      label: 'ROE',
      cellA: safeString(metricA.roe),
      cellB: safeString(metricB.roe),
      numA: numRoeA,
      numB: numRoeB,
      higherIsBetter: true,
    },
  ];

  return (
    <div className="w-full flex-1">
      <section className="mb-10 overflow-hidden rounded-2xl bg-white shadow-sm border border-slate-100">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50">
              <th className="px-6 py-4 text-slate-500 font-semibold text-xs uppercase tracking-wider w-36">구분</th>
              <th className="px-6 py-4 font-bold text-center border-l border-slate-100">
                <span className="text-primary">{dataA.companyName}</span>
                {latestYearA && <span className="block text-[10px] text-slate-400 font-normal mt-0.5">{latestYearA}년 기준 · {sourceA}</span>}
              </th>
              <th className="px-6 py-4 font-bold text-center border-l border-slate-100">
                <span className="text-rose-500">{dataB.companyName}</span>
                {latestYearB && <span className="block text-[10px] text-slate-400 font-normal mt-0.5">{latestYearB}년 기준 · {sourceB}</span>}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rows.map(({ label, cellA, cellB, numA, numB, higherIsBetter }) => {
              const aWins = numA !== null && numB !== null && (higherIsBetter ? numA > numB : numA < numB);
              const bWins = numA !== null && numB !== null && (higherIsBetter ? numB > numA : numB < numA);
              return (
                <tr key={label} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-5 font-semibold text-slate-600 text-sm">{label}</td>
                  <td className={`px-6 py-5 text-center text-sm tabular-nums ${aWins ? 'text-emerald-700 font-bold' : 'text-slate-600'}`}>
                    {cellA}
                    {aWins && <span className="ml-1 text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 rounded px-1 font-bold align-middle">우위</span>}
                  </td>
                  <td className={`px-6 py-5 text-center text-sm tabular-nums border-l border-slate-50 ${bWins ? 'text-emerald-700 font-bold' : 'text-slate-600'}`}>
                    {cellB}
                    {bWins && <span className="ml-1 text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 rounded px-1 font-bold align-middle">우위</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* Insights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="md:col-span-2 bg-gradient-to-br from-primary/5 to-transparent p-8 rounded-2xl border border-primary/10">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20 shrink-0">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-3">AI 요약 분석</h3>
              <p className="text-on-surface leading-relaxed text-base">{dynamicSummary}</p>
            </div>
          </div>
        </div>
        <div className="bg-surface-container-highest p-8 rounded-2xl flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold text-primary uppercase tracking-tighter mb-2">Notice</h4>
            <p className="text-on-surface-variant text-sm leading-relaxed">해당 비교 분석 데이터는 각 기업의 최근 공시 자료 기준 최신 연도 지표입니다.</p>
          </div>
          <div className="flex gap-2 mt-4 flex-wrap">
            <span className="px-3 py-1 bg-white rounded-full text-xs font-semibold text-slate-600">#기업비교</span>
            <span className="px-3 py-1 bg-white rounded-full text-xs font-semibold text-slate-600">#재무분석</span>
            <span className="px-3 py-1 bg-white rounded-full text-xs font-semibold text-slate-600">#AI</span>
          </div>
        </div>
      </div>
    </div>
  );
}
