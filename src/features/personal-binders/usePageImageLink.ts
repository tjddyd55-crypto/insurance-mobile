import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError } from '../../api/client';
import {
  fetchPageImageLink,
  forgetPageImageLink,
  pageImageRequestKey,
  readCachedPageImageLink,
  type PageImageLink,
  type PageImageRequest,
} from './binderPageImage';

const MAX_LINK_ATTEMPT = 2;

export function usePageImageLink(
  token: string | null,
  request: PageImageRequest | null,
): { uri: string | null | undefined; refresh: () => void } {
  const key = request ? pageImageRequestKey(request) : '';
  const errors = useRef(0);
  const [reload, setReload] = useState(0);
  const [trackedKey, setTrackedKey] = useState(key);
  const [link, setLink] = useState<PageImageLink | null>(null);
  const [uri, setUri] = useState<string | null | undefined>(undefined);
  if (trackedKey !== key) {
    setTrackedKey(key);
    setReload(0);
    setLink(null);
    setUri(undefined);
  }

  const refresh = useCallback(() => {
    if (!key || errors.current >= MAX_LINK_ATTEMPT) return;
    errors.current += 1;
    forgetPageImageLink(key);
    setReload((value) => value + 1);
  }, [key]);

  useEffect(() => {
    errors.current = 0;
  }, [key]);

  useEffect(() => {
    if (!token || !request || !key) {
      setUri(null);
      return undefined;
    }
    const cached = reload === 0 ? readCachedPageImageLink(key) : null;
    if (cached) {
      setLink(cached);
      setUri(cached.openUrl);
      return undefined;
    }
    let cancelled = false;
    setUri(undefined);
    void fetchPageImageLink(token, request)
      .then((next) => {
        if (cancelled) return;
        setLink(next);
        setUri(next.openUrl);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 410 && errors.current < MAX_LINK_ATTEMPT) {
          errors.current += 1;
          forgetPageImageLink(key);
          setReload((value) => value + 1);
          return;
        }
        setLink(null);
        setUri(null);
      });
    return () => {
      cancelled = true;
    };
  }, [key, reload, request, token]);

  useEffect(() => {
    if (!link?.expiresAt || !key) return undefined;
    const delay = Date.parse(link.expiresAt) - Date.now() - 20_000;
    if (!Number.isFinite(delay)) return undefined;
    const timer = setTimeout(() => {
      forgetPageImageLink(key);
      setReload((value) => value + 1);
    }, Math.max(delay, 0));
    return () => clearTimeout(timer);
  }, [key, link]);

  return { uri, refresh };
}
