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
    onclone: (doc) => {
      // 애니메이션 제거 (캡처 중 잘림 방지)
      doc.querySelectorAll('[class*="animate-"]').forEach((node) => {
        node.style.animation = 'none';
        node.style.opacity = '1';
        node.style.transform = 'none';
      });
      // PDF에서 불필요한 버튼 UI 숨기기 (상세보기/접기/PDF버튼 등)
      doc.querySelectorAll('button').forEach((node) => {
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

  // 한 이미지를 페이지 크기로 슬라이싱
  const contentPerPage = pageH - margin * 2;
  const numPages = Math.ceil(totalImgH / contentPerPage);

  for (let i = 0; i < numPages; i++) {
    if (i > 0) pdf.addPage();
    const yPos = margin - i * contentPerPage;
    pdf.addImage(imgData, 'JPEG', margin, yPos, contentW, totalImgH);
  }

  // pdf.save()가 async 체인에서 브라우저 다운로드 차단을 받는 경우 방지:
  // Blob URL을 직접 생성해 <a> 클릭으로 다운로드
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
