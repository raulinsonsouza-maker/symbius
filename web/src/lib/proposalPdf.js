import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export async function downloadProposalPdf(element, clientName = 'cliente') {
  await document.fonts.ready;
  await new Promise((resolve) => setTimeout(resolve, 400));

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
}
