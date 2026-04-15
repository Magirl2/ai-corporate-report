import React from 'react';
import { parseNumber, safeString } from '../utils/formatters';

// 두 기업의 재무 수치를 비교해 동적 요약 문장을 생성합니다
function buildDynamicSummary(nameA, nameB, metricA, metricB) {
  const numRevA = parseNumber(metricA.revenueGrowth);
  const numRevB = parseNumber(metricB.revenueGrowth);
  const numMarginA = parseNumber(metricA.operatingMargin);
  const numMarginB = parseNumber(metricB.operatingMargin);
  const numRoeA = parseNumber(metricA.roe);
  const numRoeB = parseNumber(metricB.roe);
  const numDebtA = parseNumber(metricA.debtRatio);
  const numDebtB = parseNumber(metricB.debtRatio);

  const points = [];

  if (numRevA !== null && numRevB !== null) {
    if (numRevA > numRevB)
      points.push(`매출 성장률에서 ${nameA}(${metricA.revenueGrowth})이 ${nameB}(${metricB.revenueGrowth})보다 앞서 있습니다.`);
    else if (numRevB > numRevA)
      points.push(`매출 성장률에서 ${nameB}(${metricB.revenueGrowth})이 ${nameA}(${metricA.revenueGrowth})보다 앞서 있습니다.`);
    else
      points.push(`두 기업의 매출 성장률이 유사한 수준입니다.`);
  }

  if (numMarginA !== null && numMarginB !== null) {
    if (numMarginA > numMarginB)
      points.push(`수익성 측면에서 ${nameA}의 영업이익률(${metricA.operatingMargin})이 더 높아 비용 효율성이 우수합니다.`);
    else if (numMarginB > numMarginA)
      points.push(`수익성 측면에서 ${nameB}의 영업이익률(${metricB.operatingMargin})이 더 높아 비용 효율성이 우수합니다.`);
  }

  if (numRoeA !== null && numRoeB !== null) {
    const winner = numRoeA > numRoeB ? nameA : nameB;
    const winnerRoe = numRoeA > numRoeB ? metricA.roe : metricB.roe;
    points.push(`자기자본이익률(ROE)은 ${winner}(${winnerRoe})이 더 높아 주주 가치 창출 능력이 상대적으로 뛰어납니다.`);
  }

  if (numDebtA !== null && numDebtB !== null) {
    const safer = numDebtA < numDebtB ? nameA : nameB;
    points.push(`부채비율은 ${safer}이 더 낮아 재무 안정성 측면에서 유리한 구조입니다.`);
  }

  if (points.length === 0) {
    return '비교 지표 데이터를 충분히 확보하지 못했습니다. 상세 수치는 아래 표를 참고하세요.';
  }

  return points.join(' ');
}

export default function CompareFinancials({ dataA, dataB }) {
  const metricA = dataA.report?.financialAnalysis?.keyMetrics?.[0] || {};
  const metricB = dataB.report?.financialAnalysis?.keyMetrics?.[0] || {};

  const numRevA = parseNumber(metricA.revenueGrowth);
  const numRevB = parseNumber(metricB.revenueGrowth);
  const numMarginA = parseNumber(metricA.operatingMargin);
  const numMarginB = parseNumber(metricB.operatingMargin);
  const numDebtA = parseNumber(metricA.debtRatio);
  const numDebtB = parseNumber(metricB.debtRatio);
  const numRoeA = parseNumber(metricA.roe);
  const numRoeB = parseNumber(metricB.roe);
  const numEpsA = parseNumber(metricA.eps);
  const numEpsB = parseNumber(metricB.eps);

  const dynamicSummary = buildDynamicSummary(dataA.companyName, dataB.companyName, metricA, metricB);

  const getWinnerClass = (valSelf, valOther, higherIsBetter = true) => {
    if (valSelf === null || valOther === null || valSelf === valOther) return 'text-slate-600';
    const isWinner = higherIsBetter ? valSelf > valOther : valSelf < valOther;
    return isWinner ? 'text-emerald-700 font-bold' : 'text-slate-600';
  };

  return (
    <div className="w-full flex-1">
      <section className="mb-12 overflow-hidden rounded-lg bg-surface-container-lowest shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-low">
              <th className="px-8 py-5 text-on-surface-variant font-semibold text-sm uppercase tracking-wider">구분</th>
              <th className="px-8 py-5 text-primary font-bold text-center border-l border-slate-100">{dataA.companyName}</th>
              <th className="px-8 py-5 text-primary font-bold text-center border-l border-slate-100">{dataB.companyName}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            <tr className="hover:bg-slate-50/50 transition-colors">
              <td className="px-8 py-6 font-medium text-slate-700">매출 성장률</td>
              <td className={`px-8 py-6 text-center ${getWinnerClass(numRevA, numRevB, true)}`}>{safeString(metricA.revenueGrowth)}</td>
              <td className={`px-8 py-6 text-center border-l border-slate-50 ${getWinnerClass(numRevB, numRevA, true)}`}>{safeString(metricB.revenueGrowth)}</td>
            </tr>
            <tr className="hover:bg-slate-50/50 transition-colors">
              <td className="px-8 py-6 font-medium text-slate-700">영업 이익률</td>
              <td className={`px-8 py-6 text-center ${getWinnerClass(numMarginA, numMarginB, true)}`}>{safeString(metricA.operatingMargin)}</td>
              <td className={`px-8 py-6 text-center border-l border-slate-50 ${getWinnerClass(numMarginB, numMarginA, true)}`}>{safeString(metricB.operatingMargin)}</td>
            </tr>
            <tr className="hover:bg-slate-50/50 transition-colors">
              <td className="px-8 py-6 font-medium text-slate-700">부채율</td>
              <td className={`px-8 py-6 text-center ${getWinnerClass(numDebtA, numDebtB, false)}`}>{safeString(metricA.debtRatio)}</td>
              <td className={`px-8 py-6 text-center border-l border-slate-50 ${getWinnerClass(numDebtB, numDebtA, false)}`}>{safeString(metricB.debtRatio)}</td>
            </tr>
            <tr className="hover:bg-slate-50/50 transition-colors">
              <td className="px-8 py-6 font-medium text-slate-700">ROE (자기자본이익률)</td>
              <td className={`px-8 py-6 text-center ${getWinnerClass(numRoeA, numRoeB, true)}`}>{safeString(metricA.roe)}</td>
              <td className={`px-8 py-6 text-center border-l border-slate-50 ${getWinnerClass(numRoeB, numRoeA, true)}`}>{safeString(metricB.roe)}</td>
            </tr>
            <tr className="hover:bg-slate-50/50 transition-colors">
              <td className="px-8 py-6 font-medium text-slate-700">EPS (주당순이익)</td>
              <td className={`px-8 py-6 text-center ${getWinnerClass(numEpsA, numEpsB, true)}`}>{safeString(metricA.eps)}</td>
              <td className={`px-8 py-6 text-center border-l border-slate-50 ${getWinnerClass(numEpsB, numEpsA, true)}`}>{safeString(metricB.eps)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Insights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="md:col-span-2 bg-gradient-to-br from-primary/5 to-transparent p-8 rounded-lg border border-primary/10">
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
        <div className="bg-surface-container-highest p-8 rounded-lg flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold text-primary uppercase tracking-tighter mb-2">Notice</h4>
            <p className="text-on-surface-variant text-sm">해당 비교 분석 데이터는 최근 공시 자료를 바탕으로 추출되었습니다.</p>
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