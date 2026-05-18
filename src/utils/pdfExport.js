import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * DOM 요소를 A4 PDF로 내보냅니다. 긴 콘텐츠는 자동으로 여러 페이지로 분할합니다.
 * @param {React.RefObject|HTMLElement} target - 캡처할 요소 (ref 또는 DOM element)
 * @param {string} filename - 저장할 파일명 (.pdf 포함)
 */
export async function exportElementAsPDF(target, filename = 'report.pdf') {
  const el = target?.current ?? target;
  if (!el) throw new Error('내보낼 요소를 찾을 수 없습니다.');

  const canvas = await html2canvas(el, {
    scale: 2,
    useCORS: true,
    allowTaint: false,
    backgroundColor: '#ffffff',
    logging: false,
    // CSS 커스텀 속성 해석을 위해 inline style 기준으로 캡처
    onclone: (doc) => {
      // 캡처 전 애니메이션 클래스 제거 (캡처 중 잘림 방지)
      doc.querySelectorAll('[class*="animate-"]').forEach((node) => {
        node.style.animation = 'none';
        node.style.opacity = '1';
        node.style.transform = 'none';
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

  // 한 이미지를 페이지 크기로 슬라이싱
  const contentPerPage = pageH - margin * 2;
  const numPages = Math.ceil(totalImgH / contentPerPage);

  for (let i = 0; i < numPages; i++) {
    if (i > 0) pdf.addPage();
    const yPos = margin - i * contentPerPage;
    pdf.addImage(imgData, 'JPEG', margin, yPos, contentW, totalImgH);
  }

  pdf.save(filename);
}
