import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// canvas fillStyle → getImageData 방식으로 임의의 CSS 색상을 강제로 rgba()로 변환.
// oklch/oklab/color-mix 등 html2canvas 미지원 함수도 브라우저가 픽셀 계산 시 변환하므로
// 어떤 형식의 색상값이 오더라도 항상 rgba() 문자열을 반환한다.
function buildColorResolver(doc) {
  const canvas = doc.createElement('canvas');
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext('2d');
  const cache = new Map();

  return function resolveColor(colorStr) {
    if (!colorStr || colorStr === 'none' || colorStr === 'currentcolor') return colorStr;
    if (cache.has(colorStr)) return cache.get(colorStr);
    try {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = '#000';      // 이전 값 리셋
      ctx.fillStyle = colorStr;    // 브라우저가 oklab/oklch/color-mix → 내부 rgba 변환
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
      const resolved = a === 0 ? 'transparent' : `rgba(${r},${g},${b},${(a / 255).toFixed(3)})`;
      cache.set(colorStr, resolved);
      return resolved;
    } catch {
      cache.set(colorStr, colorStr);
      return colorStr;
    }
  };
}

const COLOR_PROPS = [
  'color', 'background-color',
  'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
  'outline-color', 'fill', 'stroke',
];

/**
 * DOM 요소를 A4 PDF로 내보냅니다. 긴 콘텐츠는 자동으로 여러 페이지로 분할합니다.
 * @param {React.RefObject|HTMLElement} target - 캡처할 요소 (ref 또는 DOM element)
 * @param {string} filename - 저장할 파일명 (.pdf 포함)
 */
export async function exportElementAsPDF(target, filename = 'report.pdf') {
  const el = target?.current ?? target;
  if (!el) throw new Error('내보낼 요소를 찾을 수 없습니다.');

  const win = el.ownerDocument.defaultView;
  const doc = el.ownerDocument;

  // querySelectorAll('*')은 el 자신을 제외하므로 명시적으로 포함
  const originalElements = [el, ...Array.from(el.querySelectorAll('*'))];

  // canvas 기반 색상 해석기 (캐시 포함)
  const resolveColor = buildColorResolver(doc);

  // 원본 DOM의 computed 색상을 canvas로 강제 rgb 변환 후 저장
  // getComputedStyle이 oklch/color-mix를 그대로 반환하더라도 resolveColor가 처리
  const computedColors = originalElements.map(orig => {
    const cs = win.getComputedStyle(orig);
    const result = {};
    COLOR_PROPS.forEach(p => {
      const val = cs.getPropertyValue(p);
      if (val) result[p] = resolveColor(val);
    });
    return result;
  });

  const canvas = await html2canvas(el, {
    scale: 2,
    useCORS: true,
    allowTaint: false,
    backgroundColor: '#ffffff',
    logging: false,
    onclone: (clonedDoc, clonedEl) => {
      // 루트 요소 포함 — 인덱스가 originalElements와 1:1 대응
      const clonedEls = [clonedEl, ...Array.from(clonedEl.querySelectorAll('*'))];
      clonedEls.forEach((clone, i) => {
        const colors = computedColors[i];
        if (!colors) return;
        COLOR_PROPS.forEach(p => {
          const val = colors[p];
          if (val) clone.style.setProperty(p, val, 'important');
        });
      });

      // 애니메이션 제거 (캡처 중 잘림 방지)
      clonedDoc.querySelectorAll('[class*="animate-"]').forEach(node => {
        node.style.animation = 'none';
        node.style.opacity = '1';
        node.style.transform = 'none';
      });
      // 버튼 UI 숨기기 (PDF에 상세보기/접기 버튼 찍히지 않도록)
      clonedDoc.querySelectorAll('button').forEach(node => {
        node.style.display = 'none';
      });
    },
  });

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const margin = 10;
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const contentW = pageW - margin * 2;
  const totalImgH = (canvas.height / canvas.width) * contentW;
  const imgData = canvas.toDataURL('image/jpeg', 0.92);

  const contentPerPage = pageH - margin * 2;
  const numPages = Math.ceil(totalImgH / contentPerPage);

  for (let i = 0; i < numPages; i++) {
    if (i > 0) pdf.addPage();
    const yPos = margin - i * contentPerPage;
    pdf.addImage(imgData, 'JPEG', margin, yPos, contentW, totalImgH);
  }

  // pdf.save()는 async 체인 후 브라우저 다운로드 차단 가능성 있음.
  // Blob URL + <a> 클릭으로 대체.
  const blob = pdf.output('blob');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
