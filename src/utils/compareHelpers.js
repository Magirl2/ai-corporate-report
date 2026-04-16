import { parseNumber } from './formatters';

// 두 기업의 재무 수치를 비교해 동적 요약 문장을 생성합니다
export function buildDynamicSummary(nameA, nameB, metricA, metricB) {
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
