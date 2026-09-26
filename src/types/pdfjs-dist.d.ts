declare module 'pdfjs-dist/build/pdf' {
  export function getDocument(src: {
    data: Uint8Array;
    isEvalSupported?: boolean;
    disableFontFace?: boolean;
    useSystemFonts?: boolean;
  }): { promise: Promise<unknown> };
}

declare module 'pdfjs-dist/build/pdf.worker.entry';
