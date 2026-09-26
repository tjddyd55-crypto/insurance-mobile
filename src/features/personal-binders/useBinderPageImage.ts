import { useEffect, useState } from 'react';

import { loadMaterialPdfBytes } from './loadMaterialPdf';
import { renderPdfPageDataUrl } from './pdfPageRaster';

export function useBinderPageImage(
  token: string | null,
  fileId: number | null,
  cacheKey: string,
  pageNumber: number,
  maxWidth: number,
): string | null | undefined {
  const [uri, setUri] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (!token || !fileId || pageNumber < 1) {
      setUri(null);
      return undefined;
    }
    let cancelled = false;
    setUri(undefined);
    void loadMaterialPdfBytes(token, fileId)
      .then((bytes) => renderPdfPageDataUrl(cacheKey, bytes, pageNumber, maxWidth))
      .then((next) => {
        if (!cancelled) setUri(next);
      })
      .catch(() => {
        if (!cancelled) setUri(null);
      });
    return () => {
      cancelled = true;
    };
  }, [token, fileId, cacheKey, pageNumber, maxWidth]);

  return uri;
}
