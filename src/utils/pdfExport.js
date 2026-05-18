import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// canvas fillStyle → getImageData 방식으로 임의의 CSS 색상을 강제로 rgba()로 변환.
// oklch/oklab/color-mix 등 html2canvas 미지원 함수도 브라우저가 픽셀 계산 시 변환.
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
      ctx.fillStyle = '#000';
      ctx.fillStyle = colorStr;
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

// A4 너비(210mm at 96dpi). html2canvas 캡처 기준 너비.
const A4_PX = 794;

/**
 * DOM 요소를 A4 PDF로 내보냅니다.
 * - windowWidth: 800 → index.css의 max-width:1023px 미디어쿼리 발동 → bento-grid 1컬럼 전환
 * - 캡처 너비 794px → A4 비율로 텍스트 가독성 유지
 * - PNG 포맷 → JPEG 압축 아티팩트 없이 선명한 텍스트
 */
export async function exportElementAsPDF(target, filename = 'report.pdf') {
  const el = target?.current ?? target;
  if (!el) throw new Error('내보낼 요소를 찾을 수 없습니다.');

  const win = el.ownerDocument.defaultView;
  const doc = el.ownerDocument;

  // querySelectorAll('*')은 el 자신을 제외하므로 명시적으로 포함
  const originalElements = [el, ...Array.from(el.querySelectorAll('*'))];

  // canvas 기반 색상 해석기
  const resolveColor = buildColorResolver(doc);

  // 원본 DOM의 computed 색상을 캡처 전 수집
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
    // windowWidth 800 → index.css의 @media (max-width: 1023px) 발동
    // → .bento-grid { grid-template-columns: 1fr } 자동 적용 (1컬럼)
    // → md: 브레이크포인트(768px)도 비활성 → 내부 md:grid-cols-2도 1컬럼
    windowWidth: 800,
    onclone: (clonedDoc, clonedEl) => {
      // ── A4 너비 강제 ──────────────────────────────────────────────────
      clonedEl.style.setProperty('width', `${A4_PX}px`, 'important');
      clonedEl.style.setProperty('max-width', `${A4_PX}px`, 'important');
      clonedEl.style.setProperty('overflow', 'visible', 'important');

      // ── 잔여 멀티컬럼 그리드 단일컬럼 강제 (windowWidth로 미처리된 케이스 대비) ─
      clonedDoc.querySelectorAll('*').forEach(node => {
        const cls = typeof node.className === 'string' ? node.className : '';
        if (!cls) return;
        // grid-cols-2 이상인 요소 → block으로 변환
        if (/grid-cols-[2-9]/.test(cls) || /sm:grid-cols-|md:grid-cols-|lg:grid-cols-/.test(cls)) {
          node.style.setProperty('display', 'block', 'important');
        }
        // col-span → 전체 너비
        if (/col-span-/.test(cls)) {
          node.style.setProperty('width', '100%', 'important');
          node.style.setProperty('max-width', '100%', 'important');
        }
      });

      // ── oklab/oklch 색상 → rgba() 주입 ────────────────────────────────
      const clonedEls = [clonedEl, ...Array.from(clonedEl.querySelectorAll('*'))];
      clonedEls.forEach((clone, i) => {
        const colors = computedColors[i];
        if (!colors) return;
        COLOR_PROPS.forEach(p => {
          const val = colors[p];
          if (val) clone.style.setProperty(p, val, 'important');
        });
      });

      // ── 애니메이션 제거 ────────────────────────────────────────────────
      clonedDoc.querySelectorAll('[class*="animate-"]').forEach(node => {
        node.style.animation = 'none';
        node.style.opacity = '1';
        node.style.transform = 'none';
      });

      // ── 버튼 숨기기 ────────────────────────────────────────────────────
      clonedDoc.querySelectorAll('button').forEach(node => {
        node.style.display = 'none';
      });
    },
  });

  // PNG 포맷: JPEG 압축 아티팩트 없이 텍스트 선명도 유지
  const imgData = canvas.toDataURL('image/png');

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const margin = 10;
  const pageW = pdf.internal.pageSize.getWidth();   // 210mm
  const pageH = pdf.internal.pageSize.getHeight();  // 297mm
  const contentW = pageW - margin * 2;              // 190mm
  const totalImgH = (canvas.height / canvas.width) * contentW;

  // 한 이미지를 페이지 높이로 슬라이싱 (여백 제외 277mm)
  const contentPerPage = pageH - margin * 2;
  const numPages = Math.ceil(totalImgH / contentPerPage);

  for (let i = 0; i < numPages; i++) {
    if (i > 0) pdf.addPage();
    const yPos = margin - i * contentPerPage;
    pdf.addImage(imgData, 'PNG', margin, yPos, contentW, totalImgH);
  }

  // Blob URL로 다운로드 (async 체인 이후 브라우저 다운로드 차단 방지)
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
