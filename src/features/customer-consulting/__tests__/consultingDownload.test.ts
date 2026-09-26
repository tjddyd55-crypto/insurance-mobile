import { buildConsultingPageScript } from '../consultingWebPage';
import {
  classifyConsultingRemoteDownload,
  consultingDownloadHeaders,
  consultingPdfFileName,
  readConsultingRemoteUrl,
  reduceConsultingPdfMessage,
  takeShareTurn,
} from '../consultingDownload';

const ORIGIN = 'https://insurance-dev.up.railway.app';

describe('consulting download handoff', () => {
  it('classifies storage open URLs and binder export URLs on the DEV origin', () => {
    expect(classifyConsultingRemoteDownload(
      `${ORIGIN}/api/storage/files/open/short-token/${encodeURIComponent('상담.pdf')}`,
      ORIGIN,
    )).toEqual({
      kind: 'open-file',
      url: `${ORIGIN}/api/storage/files/open/short-token/${encodeURIComponent('상담.pdf')}`,
      fileName: '상담.pdf',
    });
    expect(classifyConsultingRemoteDownload(
      `${ORIGIN}/backend/personal-binders/binder-1/export`,
      ORIGIN,
    )).toEqual({
      kind: 'authorized-export',
      url: `${ORIGIN}/backend/personal-binders/binder-1/export`,
      fileName: 'personal-binder.pdf',
    });
    expect(classifyConsultingRemoteDownload(`${ORIGIN}/personal-binders`, ORIGIN)).toBeNull();
    expect(classifyConsultingRemoteDownload(
      'https://insurance-production-7bd8.up.railway.app/api/personal-binders/1/export',
      ORIGIN,
    )).toBeNull();
  });

  it('keeps file names inside a single path segment', () => {
    expect(consultingPdfFileName('../secret.pdf')).toBe('secret.pdf');
    expect(consultingPdfFileName('notes')).toBe('notes.pdf');
  });

  it('reassembles a chunked PDF and ignores a foreign transfer', () => {
    const payload = globalThis.btoa('binder-pdf');
    const begin = JSON.stringify({
      type: 'consulting-pdf-begin',
      id: 'pdf-1',
      fileName: '내 바인더.pdf',
      chunkCount: 1,
    });
    const chunk = JSON.stringify({
      type: 'consulting-pdf-chunk',
      id: 'pdf-1',
      index: 0,
      data: payload,
    });
    const started = reduceConsultingPdfMessage(null, begin);
    const finished = reduceConsultingPdfMessage(
      reduceConsultingPdfMessage(started.transfer, chunk).transfer,
      JSON.stringify({ type: 'consulting-pdf-end', id: 'pdf-1' }),
    );
    expect(finished.fileName).toBe('내 바인더.pdf');
    expect(finished.bytes ? globalThis.btoa(String.fromCharCode(...finished.bytes)) : '').toBe(payload);
    expect(finished.transfer).toBeNull();

    const ignored = reduceConsultingPdfMessage(started.transfer, JSON.stringify({
      type: 'consulting-pdf-end',
      id: 'other',
    }));
    expect(ignored.bytes).toBeNull();
    expect(ignored.failed).toBe(false);
  });

  it('reads a remote download message without treating it as a PDF', () => {
    const raw = JSON.stringify({ type: 'consulting-remote', url: `${ORIGIN}/api/personal-binders/9/export` });
    expect(readConsultingRemoteUrl(raw)).toBe(`${ORIGIN}/api/personal-binders/9/export`);
    expect(reduceConsultingPdfMessage(null, raw).failed).toBe(false);
  });

  it('collapses a repeated share of the same URL', () => {
    const state = { key: '', at: 0 };
    expect(takeShareTurn(state, 'same', 1_000)).toBe(true);
    expect(takeShareTurn(state, 'same', 1_200)).toBe(false);
    expect(takeShareTurn(state, 'same', 3_000)).toBe(true);
  });

  it('sends the session bearer only for binder export, never for an open-token file', () => {
    expect(consultingDownloadHeaders('open-file', 'jwt-test-value')).toBeUndefined();
    expect(consultingDownloadHeaders('authorized-export', 'jwt-test-value')).toEqual({
      Authorization: 'Bearer jwt-test-value',
    });
  });

  it('enables pinch and PDF bridge without embedding a session', () => {
    const script = buildConsultingPageScript();
    expect(script).toContain('user-scalable=yes');
    expect(script).toContain('maximum-scale=5');
    expect(script).toContain('consulting-pdf-begin');
    expect(script).toContain('consulting-remote');
    expect(script).not.toContain('insurance.auth.session');
    expect(script).not.toContain('localStorage');
    expect(script).not.toMatch(/[?&]token=/);
    expect(scriptMatchesDownload(`${ORIGIN}/backend/personal-binders/abc/export`, script)).toBe(true);
    expect(scriptMatchesDownload(`${ORIGIN}/personal-binders/abc/view`, script)).toBe(false);
  });
});

function scriptMatchesDownload(rawUrl: string, script: string): boolean {
  const match = script.match(/function isRemoteDownload\(href\) \{([\s\S]*?)\n  \}/);
  if (!match?.[1]) {
    throw new Error('다운로드 판별 함수가 없습니다.');
  }
  const isRemoteDownload = new Function('href', 'window', 'URL', match[1]) as (
    href: string,
    window: { location: { origin: string } },
    url: typeof URL,
  ) => boolean;
  return isRemoteDownload(rawUrl, { location: { origin: ORIGIN } }, URL);
}
