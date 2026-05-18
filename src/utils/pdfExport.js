/**
 * 브라우저 네이티브 Print API로 PDF를 생성합니다.
 * html2canvas 방식과 달리 이미지 축소 없이 원본 레이아웃 그대로 출력됩니다.
 *
 * @param {() => void} [onAfterPrint] - 프린트 다이얼로그 닫힌 후 실행할 콜백
 */
export function exportElementAsPDF(_ref, _filename, { onAfterPrint } = {}) {
  if (onAfterPrint) {
    const handler = () => {
      window.removeEventListener('afterprint', handler);
      onAfterPrint();
    };
    window.addEventListener('afterprint', handler);
  }
  window.print();
}
