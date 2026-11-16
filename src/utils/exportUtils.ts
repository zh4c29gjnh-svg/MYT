/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { toCanvas } from 'html-to-image';
import { jsPDF } from 'jspdf';

/**
 * Triggers a browser download from a Blob object
 */
function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    if (link.parentNode) {
      link.parentNode.removeChild(link);
    }
    URL.revokeObjectURL(url);
  }, 1500);
}

/**
 * Converts any loaded HTMLImageElement into an inline data:image/png;base64 URL
 * so SVG <foreignObject> rendering always includes every image without CORS or path issues.
 */
function convertImageToDataUrl(img: HTMLImageElement): string | null {
  try {
    if (!img.complete || !img.naturalWidth || !img.naturalHeight) return null;
    if (img.src.startsWith('data:')) return img.src;
    const c = document.createElement('canvas');
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    return c.toDataURL('image/png');
  } catch {
    return null;
  }
}

/**
 * Renders a specific HTMLElement into a high-resolution HTMLCanvasElement
 */
async function renderNodeToCanvas(
  element: HTMLElement
): Promise<HTMLCanvasElement | null> {
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }

  const images = Array.from(element.querySelectorAll('img'));
  await Promise.all(
    images.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });
    })
  );

  // Temporarily inline any non-data: images so SVG foreignObject always renders them
  const originalSrcs = new Map<HTMLImageElement, string>();
  for (const img of images) {
    if (!img.src.startsWith('data:')) {
      const dataUrl = convertImageToDataUrl(img);
      if (dataUrl) {
        originalSrcs.set(img, img.src);
        img.src = dataUrl;
      }
    }
  }

  // Temporarily disable third-party stylesheets (e.g. Google Identity Services) that lack CORS headers
  const disabledLinks: HTMLLinkElement[] = [];
  const allLinks = Array.from(
    document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')
  );
  for (const link of allLinks) {
    if (
      link.href &&
      link.href.includes('accounts.google.com') &&
      !link.disabled
    ) {
      link.disabled = true;
      disabledLinks.push(link);
    }
  }

  const targetWidth = element.offsetWidth || 794;
  const targetHeight = element.offsetHeight || 1123;

  const renderOptions = {
    width: targetWidth,
    height: targetHeight,
    canvasWidth: Math.round(targetWidth * 2.5),
    canvasHeight: Math.round(targetHeight * 2.5),
    pixelRatio: 2.5,
    backgroundColor: '#ffffff',
    cacheBust: false,
    style: {
      transform: 'none',
      transformOrigin: 'top left',
      margin: '0',
      boxShadow: 'none',
      border: 'none',
    },
  };

  try {
    return await toCanvas(element, renderOptions);
  } catch (err) {
    console.warn('Retrying toCanvas with skipFonts:', err);
    return await toCanvas(element, {
      ...renderOptions,
      skipFonts: true,
    });
  } finally {
    for (const link of disabledLinks) {
      link.disabled = false;
    }
    for (const [img, origSrc] of originalSrcs.entries()) {
      img.src = origSrc;
    }
  }
}

/**
 * Renders a target DOM element (or its child `.a4-print-page` elements when multi-page)
 * into an array of high-resolution HTMLCanvasElements.
 */
async function renderElementPagesToCanvases(
  elementId: string
): Promise<HTMLCanvasElement[]> {
  const root = document.getElementById(elementId);
  if (!root) {
    console.error(`Element with id "${elementId}" not found`);
    return [];
  }

  const pageNodes = Array.from(
    root.querySelectorAll<HTMLElement>('.a4-print-page')
  );

  if (pageNodes.length > 0) {
    const canvases: HTMLCanvasElement[] = [];
    for (const pageNode of pageNodes) {
      const c = await renderNodeToCanvas(pageNode);
      if (c) canvases.push(c);
    }
    return canvases;
  }

  const single = await renderNodeToCanvas(root);
  return single ? [single] : [];
}

/**
 * Stitches multiple page canvases vertically into a single high-resolution canvas
 */
function stitchCanvasesVertically(
  canvases: HTMLCanvasElement[]
): HTMLCanvasElement {
  if (canvases.length === 1) return canvases[0];

  const gapPx = 24;
  const maxWidth = Math.max(...canvases.map((c) => c.width));
  const totalHeight =
    canvases.reduce((sum, c) => sum + c.height, 0) +
    gapPx * (canvases.length - 1);

  const merged = document.createElement('canvas');
  merged.width = maxWidth;
  merged.height = totalHeight;
  const ctx = merged.getContext('2d');
  if (!ctx) return canvases[0];

  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(0, 0, maxWidth, totalHeight);

  let currentY = 0;
  for (const c of canvases) {
    ctx.drawImage(c, 0, currentY);
    currentY += c.height + gapPx;
  }

  return merged;
}

/**
 * Downloads a DOM element as a PNG image file matching the on-screen preview 100%
 */
export async function exportElementAsPng(
  elementId: string,
  fileName: string = 'document.png'
): Promise<boolean> {
  try {
    const canvases = await renderElementPagesToCanvases(elementId);
    if (canvases.length === 0) return false;

    const finalCanvas = stitchCanvasesVertically(canvases);
    const finalName = fileName.endsWith('.png') ? fileName : `${fileName}.png`;

    const blob = await new Promise<Blob | null>((resolve) =>
      finalCanvas.toBlob((b) => resolve(b), 'image/png', 1.0)
    );

    if (!blob) {
      return false;
    }

    downloadBlob(blob, finalName);
    return true;
  } catch (err) {
    console.error('Failed to export element as PNG:', err);
    return false;
  }
}

/**
 * Helper to create a multi-page or single-page PDF Blob from rendered page canvases
 * (automatically detects Portrait vs Landscape A4)
 */
function createPdfBlobFromCanvases(canvases: HTMLCanvasElement[]): Blob {
  const first = canvases[0];
  const isLandscape = first.width > first.height;

  const pdf = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageWidth = isLandscape ? 297 : 210;
  const pageHeight = isLandscape ? 210 : 297;

  if (canvases.length > 1) {
    canvases.forEach((canvas, idx) => {
      if (idx > 0) {
        pdf.addPage('a4', isLandscape ? 'landscape' : 'portrait');
      }
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(
        imgData,
        'PNG',
        0,
        0,
        pageWidth,
        pageHeight,
        undefined,
        'FAST'
      );
    });
    return pdf.output('blob');
  }

  // Single canvas (may be 1 page or tall multi-page)
  const canvas = first;
  const imgData = canvas.toDataURL('image/png');
  const imgHeight = (canvas.height * pageWidth) / canvas.width;

  if (imgHeight <= pageHeight + 8) {
    pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
  } else {
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(
      imgData,
      'PNG',
      0,
      position,
      pageWidth,
      imgHeight,
      undefined,
      'FAST'
    );
    heightLeft -= pageHeight;

    while (heightLeft > 5) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(
        imgData,
        'PNG',
        0,
        position,
        pageWidth,
        imgHeight,
        undefined,
        'FAST'
      );
      heightLeft -= pageHeight;
    }
  }

  return pdf.output('blob');
}

/**
 * Downloads a DOM element as a high-quality PDF document (A4 portrait or landscape, 1 or more pages)
 */
export async function exportElementAsPdf(
  elementId: string,
  fileName: string = 'document.pdf'
): Promise<boolean> {
  try {
    const canvases = await renderElementPagesToCanvases(elementId);
    if (canvases.length === 0) return false;

    const finalName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
    const pdfBlob = createPdfBlobFromCanvases(canvases);
    downloadBlob(pdfBlob, finalName);
    return true;
  } catch (err) {
    console.error('Failed to export element as PDF:', err);
    return false;
  }
}

/**
 * Mounts one or more rendered A4 page images into #myt-print-mount so @media print prints ONLY the A4 pages
 */
export function mountPrintImages(
  imgDataUrls: string[],
  isLandscape = false
): void {
  let mount = document.getElementById('myt-print-mount');
  if (!mount) {
    mount = document.createElement('div');
    mount.id = 'myt-print-mount';
    document.body.appendChild(mount);
  }

  let orientStyle = document.getElementById('myt-print-page-orientation');
  if (!orientStyle) {
    orientStyle = document.createElement('style');
    orientStyle.id = 'myt-print-page-orientation';
    document.head.appendChild(orientStyle);
  }
  orientStyle.textContent = isLandscape
    ? `@media print { @page { size: A4 landscape; margin: 0; } html, body, body.myt-printing-active > #myt-print-mount { width: 297mm !important; } }`
    : `@media print { @page { size: A4 portrait; margin: 0; } html, body, body.myt-printing-active > #myt-print-mount { width: 210mm !important; } }`;

  mount.innerHTML = '';
  imgDataUrls.forEach((dataUrl, idx) => {
    const img = document.createElement('img');
    img.src = dataUrl;
    img.alt = `Print Document Page ${idx + 1}`;
    img.style.width = isLandscape ? '297mm' : '210mm';
    img.style.height = isLandscape ? '210mm' : '297mm';
    img.style.display = 'block';
    img.style.margin = '0 auto';
    img.style.pageBreakInside = 'avoid';
    if (idx < imgDataUrls.length - 1) {
      img.style.pageBreakAfter = 'always';
      img.style.breakAfter = 'page';
    }
    mount!.appendChild(img);
  });

  document.body.classList.add('myt-printing-active');
}

export function unmountPrintImage(): void {
  document.body.classList.remove('myt-printing-active');
}

/**
 * Attempts to trigger native browser print and returns true if the print dialog actually opened
 */
export function triggerPrint(): boolean {
  let dialogOpened = false;
  const onBeforePrint = () => {
    dialogOpened = true;
  };
  window.addEventListener('beforeprint', onBeforePrint, { once: true });
  try {
    window.print();
  } catch {
    // ignore
  }
  window.removeEventListener('beforeprint', onBeforePrint);
  return dialogOpened;
}

export interface PreparedPrintResult {
  ok: boolean;
  dialogOpened: boolean;
  imgDataUrl: string;
  pdfBlobUrl: string;
  pdfBlob: Blob;
}

/**
 * Renders the target A4 document element (all pages), mounts them for isolated A4 printing,
 * attempts native window.print(), and returns print assets (PNG + multi-page PDF Blob URL).
 */
export async function prepareAndTriggerPrint(
  elementId: string
): Promise<PreparedPrintResult | null> {
  try {
    const canvases = await renderElementPagesToCanvases(elementId);
    if (canvases.length === 0) return null;

    const first = canvases[0];
    const isLandscape = first.width > first.height;
    const pageImgUrls = canvases.map((c) => c.toDataURL('image/png'));
    const stitchedCanvas = stitchCanvasesVertically(canvases);
    const imgDataUrl = stitchedCanvas.toDataURL('image/png');
    const pdfBlob = createPdfBlobFromCanvases(canvases);
    const pdfBlobUrl = URL.createObjectURL(pdfBlob);

    mountPrintImages(pageImgUrls, isLandscape);

    await new Promise<void>((resolve) => setTimeout(resolve, 80));
    const dialogOpened = triggerPrint();

    return {
      ok: true,
      dialogOpened,
      imgDataUrl,
      pdfBlobUrl,
      pdfBlob,
    };
  } catch (err) {
    console.error('Failed to prepare document for print:', err);
    return null;
  }
}
