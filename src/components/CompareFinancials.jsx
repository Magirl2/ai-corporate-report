import React from 'react';
import { parseNumber, safeString } from '../utils/formatters';

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

  const getWinnerClass = (valSelf, valOther, higherIsBetter = true) => {
    if (valSelf === null || valOther === null || valSelf === valOther) return "text-slate-600";
    const isWinner = higherIsBetter ? valSelf > valOther : valSelf < valOther;
    return isWinner ? "text-tertiary font-bold bg-tertiary-fixed" : "text-slate-600";
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

      {/* Insights Grid (Bento Style) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="md:col-span-2 bg-gradient-to-br from-primary/5 to-transparent p-8 rounded-lg border border-primary/10">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20 shrink-0">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-3">AI 요약 분석</h3>
              <p className="text-on-surface leading-relaxed text-lg">
                수익성 및 안정성 측면 등 전반적인 재무 건전성은 두 기업의 세부 수치에 따라 다르게 평가될 수 있습니다. 
                현재 지표를 기반으로 비교 우위를 직접 확인하시기 바랍니다. AI 리포트는 참고용입니다.
              </p>
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