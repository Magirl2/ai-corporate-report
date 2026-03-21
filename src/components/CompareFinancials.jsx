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

  const getWinnerClass = (valA, valB, higherIsBetter = true) => {
    if (valA === null || valB === null || valA === valB) return "text-slate-800 font-semibold";
    if (higherIsBetter) return valA > valB ? "text-rose-600 font-extrabold bg-rose-50 px-2 py-1 rounded" : "text-slate-500";
    return valA < valB ? "text-rose-600 font-extrabold bg-rose-50 px-2 py-1 rounded" : "text-slate-500";
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
      <table className="w-full text-center text-sm md:text-base">
        <thead className="bg-slate-200/50 text-slate-600 font-bold border-b border-slate-200">
          <tr>
            <th className="py-4 px-2 w-1/3 text-blue-800">{dataA.companyName}</th>
            <th className="py-4 px-2 w-1/3 bg-slate-200/50">비교 항목</th>
            <th className="py-4 px-2 w-1/3 text-rose-800">{dataB.companyName}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          <tr className="hover:bg-slate-50 transition-colors">
            <td className={`py-4 px-2 ${getWinnerClass(numRevA, numRevB, true)}`}>{safeString(metricA.revenueGrowth)}</td>
            <td className="py-4 px-2 font-bold text-slate-700 bg-slate-50/50">매출 성장률</td>
            <td className={`py-4 px-2 ${getWinnerClass(numRevB, numRevA, true)}`}>{safeString(metricB.revenueGrowth)}</td>
          </tr>
          <tr className="hover:bg-slate-50 transition-colors">
            <td className={`py-4 px-2 ${getWinnerClass(numMarginA, numMarginB, true)}`}>{safeString(metricA.operatingMargin)}</td>
            <td className="py-4 px-2 font-bold text-slate-700 bg-slate-50/50">영업 이익률</td>
            <td className={`py-4 px-2 ${getWinnerClass(numMarginB, numMarginA, true)}`}>{safeString(metricB.operatingMargin)}</td>
          </tr>
          <tr className="hover:bg-slate-50 transition-colors">
            <td className={`py-4 px-2 ${getWinnerClass(numDebtA, numDebtB, false)}`}>{safeString(metricA.debtRatio)}</td>
            <td className="py-4 px-2 font-bold text-slate-700 bg-slate-50/50">부채율</td>
            <td className={`py-4 px-2 ${getWinnerClass(numDebtB, numDebtA, false)}`}>{safeString(metricB.debtRatio)}</td>
          </tr>
          <tr className="hover:bg-slate-50 transition-colors">
            <td className={`py-4 px-2 ${getWinnerClass(numRoeA, numRoeB, true)}`}>{safeString(metricA.roe)}</td>
            <td className="py-4 px-2 font-bold text-purple-700 bg-purple-50/50">ROE</td>
            <td className={`py-4 px-2 ${getWinnerClass(numRoeB, numRoeA, true)}`}>{safeString(metricB.roe)}</td>
          </tr>
          <tr className="hover:bg-slate-50 transition-colors">
            <td className={`py-4 px-2 ${getWinnerClass(numEpsA, numEpsB, true)}`}>{safeString(metricA.eps)}</td>
            <td className="py-4 px-2 font-bold text-emerald-700 bg-emerald-50/50">EPS</td>
            <td className={`py-4 px-2 ${getWinnerClass(numEpsB, numEpsA, true)}`}>{safeString(metricB.eps)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}