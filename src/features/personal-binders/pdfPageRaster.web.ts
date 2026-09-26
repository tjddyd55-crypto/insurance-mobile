import 'pdfjs-dist/build/pdf.worker.entry';
import { getDocument } from 'pdfjs-dist/build/pdf';

type PdfViewport = { width: number; height: number };

type PdfPage = {
  getViewport: (params: { scale: number }) => PdfViewport;
  render: (params: {
    canvasContext: CanvasRenderingContext2D;
    viewport: PdfViewport;
  }) => { promise: Promise<void> };
};

type PdfDocument = {
  getPage: (pageNumber: number) => Promise<PdfPage>;
  destroy: () => Promise<void>;
};

const documents = new Map<string, Promise<PdfDocument>>();

function loadDocument(cacheKey: string, bytes: Uint8Array): Promise<PdfDocument> {
  const cached = documents.get(cacheKey);
  if (cached) return cached;
  const loading = getDocument({
    data: bytes,
    isEvalSupported: false,
    disableFontFace: false,
    useSystemFonts: true,
  }).promise as Promise<PdfDocument>;
  documents.set(cacheKey, loading);
  loading.catch(() => documents.delete(cacheKey));
  return loading;
}

export async function renderPdfPageDataUrl(
  cacheKey: string,
  bytes: Uint8Array,
  pageNumber: number,
  maxWidth: number,
): Promise<string | null> {
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
    return null;
  }
  const pdf = await loadDocument(cacheKey, bytes);
  const page = await pdf.getPage(pageNumber);
  const base = page.getViewport({ scale: 1 });
  const scale = Math.min(2, Math.max(0.2, maxWidth / Math.max(base.width, 1)));
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.floor(viewport.width));
  canvas.height = Math.max(1, Math.floor(viewport.height));
  const context = canvas.getContext('2d');
  if (!context) return null;
  await page.render({ canvasContext: context, viewport }).promise;
  return canvas.toDataURL('image/png');
}
