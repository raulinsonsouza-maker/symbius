import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

async function withPdfCaptureLayout(element, run) {
  if (!element) return run();
  const prev = {
    width: element.style.width,
    maxWidth: element.style.maxWidth,
    minWidth: element.style.minWidth,
    padding: element.style.padding,
  };
  element.classList.add('is-pdf-capture');
  element.style.width = '794px';
  element.style.maxWidth = '794px';
  element.style.minWidth = '794px';
  element.style.padding = '48px 52px 64px';
  try {
    await document.fonts.ready;
    await new Promise((resolve) => setTimeout(resolve, 400));
    return await run();
  } finally {
    element.classList.remove('is-pdf-capture');
    element.style.width = prev.width;
    element.style.maxWidth = prev.maxWidth;
    element.style.minWidth = prev.minWidth;
    element.style.padding = prev.padding;
  }
}

export async function downloadProposalPdf(element, clientName = 'cliente') {
  await withPdfCaptureLayout(element, async () => {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 794,
    });

    const imgData = canvas.toDataURL('image/png', 1.0);
    const pdfWidth = 210;
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [pdfWidth, pdfHeight],
      compress: true,
    });
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'MEDIUM');
    const slug = String(clientName || 'cliente')
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    pdf.save(`proposta-symbius-${slug || 'cliente'}.pdf`);
  });
}
