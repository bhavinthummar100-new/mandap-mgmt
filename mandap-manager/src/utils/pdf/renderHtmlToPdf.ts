import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { INVOICE_PAGE_WIDTH } from './invoiceStyles';

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

async function waitForImages(container: HTMLElement): Promise<void> {
  const images = Array.from(container.querySelectorAll('img'));
  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
            return;
          }
          img.onload = () => resolve();
          img.onerror = () => resolve();
        })
    )
  );
}

async function waitForFonts(targetDoc: Document): Promise<void> {
  const fontSet = (targetDoc as Document & { fonts?: FontFaceSet }).fonts;
  if (fontSet) {
    try {
      await fontSet.ready;
      // Ensure commonly used weights are resolved before rasterizing.
      await Promise.allSettled([
        fontSet.load('400 11px Inter'),
        fontSet.load('500 11px Inter'),
        fontSet.load('600 10px Inter'),
        fontSet.load('700 22px Inter'),
      ]);
    } catch {
      // Fallback delay below handles cases where FontFaceSet is unsupported.
    }
  }
  await new Promise((resolve) => setTimeout(resolve, 450));
}

export async function renderHtmlToPdf(html: string, filename: string): Promise<void> {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-10000px';
  iframe.style.top = '0';
  iframe.style.width = `${INVOICE_PAGE_WIDTH}px`;
  iframe.style.height = '2000px';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (!iframeDoc) {
    document.body.removeChild(iframe);
    throw new Error('Unable to render PDF preview frame');
  }

  iframeDoc.open();
  iframeDoc.write(html);
  iframeDoc.close();

  const page = iframeDoc.querySelector('.classic-page, .invoice-page') as HTMLElement | null;
  if (!page) {
    document.body.removeChild(iframe);
    throw new Error('Invoice template root not found (.classic-page/.invoice-page)');
  }

  await waitForFonts(iframeDoc);
  await waitForImages(page);

  const canvas = await html2canvas(page, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    width: INVOICE_PAGE_WIDTH,
    windowWidth: INVOICE_PAGE_WIDTH,
  });

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidthPx = canvas.width;
  const pageHeightPx = canvas.height;
  const sliceHeightPx = Math.floor((A4_HEIGHT_MM * pageWidthPx) / A4_WIDTH_MM);

  let positionY = 0;
  let pageIndex = 0;

  while (positionY < pageHeightPx) {
    const sliceCanvas = document.createElement('canvas');
    sliceCanvas.width = pageWidthPx;
    sliceCanvas.height = Math.min(sliceHeightPx, pageHeightPx - positionY);

    const ctx = sliceCanvas.getContext('2d');
    if (!ctx) break;

    ctx.drawImage(
      canvas,
      0,
      positionY,
      pageWidthPx,
      sliceCanvas.height,
      0,
      0,
      pageWidthPx,
      sliceCanvas.height
    );

    const imgData = sliceCanvas.toDataURL('image/png');
    const renderedHeightMm = (sliceCanvas.height * A4_WIDTH_MM) / pageWidthPx;

    if (pageIndex > 0) {
      pdf.addPage();
    }

    pdf.addImage(imgData, 'PNG', 0, 0, A4_WIDTH_MM, renderedHeightMm);

    positionY += sliceHeightPx;
    pageIndex += 1;
  }

  pdf.save(filename);
  document.body.removeChild(iframe);
}
