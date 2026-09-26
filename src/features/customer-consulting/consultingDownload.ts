/**
 * 상담 WebView에서 PDF로 이어지는 주소와, 페이지가 보내는 다운로드 메시지.
 * 세션 토큰은 여기 넣지 않는다. 열기 주소의 짧은 토큰만 경로에 있다.
 */

const MAX_CHUNKS = 400;
const MAX_CHUNK_LENGTH = 64_000;
const OPEN_FILE_PATH = /^\/(?:api|backend)\/storage\/files\/open\/[^/]+\/([^/]+)$/;
const EXPORT_PATH = /^\/(?:api|backend)\/personal-binders\/[^/]+\/export\/?$/;
const SAFE_ID = /^[A-Za-z0-9_-]{1,40}$/;
const BASE64_CHUNK = /^[A-Za-z0-9+/]*={0,2}$/;
const UNSAFE_FILE_CHARS = /[^\w.\-()가-힣 ]+/g;

export type ConsultingRemoteDownload = {
  kind: 'open-file' | 'authorized-export';
  url: string;
  fileName: string;
};

export type PdfTransfer = {
  id: string;
  fileName: string;
  chunkCount: number;
  chunks: (string | undefined)[];
  received: number;
};

export type PdfShareResult = {
  transfer: PdfTransfer | null;
  fileName: string | null;
  bytes: Uint8Array | null;
  failed: boolean;
};

type ConsultingWebMessage =
  | { kind: 'remote'; url: string }
  | { kind: 'pdf-error' }
  | { kind: 'pdf-begin'; id: string; fileName: string; chunkCount: number }
  | { kind: 'pdf-chunk'; id: string; index: number; data: string }
  | { kind: 'pdf-end'; id: string };

type JsonRecord = Record<string, unknown>;

export function classifyConsultingRemoteDownload(
  rawUrl: string,
  allowedOrigin: string,
): ConsultingRemoteDownload | null {
  const url = parseHttpsUrl(rawUrl);
  if (!url || url.origin !== allowedOrigin) {
    return null;
  }
  const openName = OPEN_FILE_PATH.exec(url.pathname)?.[1];
  if (openName) {
    return { kind: 'open-file', url: url.toString(), fileName: consultingPdfFileName(openName) };
  }
  if (!EXPORT_PATH.test(url.pathname)) {
    return null;
  }
  return { kind: 'authorized-export', url: url.toString(), fileName: 'personal-binder.pdf' };
}

export function readConsultingRemoteUrl(raw: string): string | null {
  const message = readConsultingWebMessage(raw);
  return message?.kind === 'remote' ? message.url : null;
}

export function reduceConsultingPdfMessage(transfer: PdfTransfer | null, raw: string): PdfShareResult {
  const message = readConsultingWebMessage(raw);
  if (!message || message.kind === 'remote') {
    return { transfer, fileName: null, bytes: null, failed: false };
  }
  if (message.kind === 'pdf-error') {
    return { transfer: null, fileName: null, bytes: null, failed: true };
  }
  if (message.kind === 'pdf-begin') {
    return { transfer: beginPdfTransfer(message), fileName: null, bytes: null, failed: false };
  }
  return reduceExistingTransfer(transfer, message);
}

export function consultingPdfFileName(rawName: string): string {
  const segment = rawName.split(/[/\\]/).pop() ?? '';
  const cleaned = safeDecode(segment).trim().replace(UNSAFE_FILE_CHARS, '_').slice(0, 120);
  if (!cleaned || cleaned === '.' || cleaned === '..') {
    return 'binder.pdf';
  }
  return cleaned.toLowerCase().endsWith('.pdf') ? cleaned : `${cleaned}.pdf`;
}

export function consultingDownloadHeaders(
  kind: ConsultingRemoteDownload['kind'],
  accessToken: string,
): Record<string, string> | undefined {
  if (kind !== 'authorized-export') {
    return undefined;
  }
  return { Authorization: `Bearer ${accessToken}` };
}

export function takeShareTurn(state: { key: string; at: number }, key: string, now: number): boolean {
  if (state.key === key && now - state.at < 1500) {
    return false;
  }
  state.key = key;
  state.at = now;
  return true;
}

function reduceExistingTransfer(
  transfer: PdfTransfer | null,
  message: Extract<ConsultingWebMessage, { kind: 'pdf-chunk' | 'pdf-end' }>,
): PdfShareResult {
  if (!transfer || transfer.id !== message.id) {
    return { transfer, fileName: null, bytes: null, failed: false };
  }
  if (message.kind === 'pdf-chunk') {
    return { transfer: addPdfChunk(transfer, message), fileName: null, bytes: null, failed: false };
  }
  const bytes = finishPdfTransfer(transfer);
  if (!bytes || bytes.byteLength === 0) {
    return { transfer: null, fileName: null, bytes: null, failed: true };
  }
  return { transfer: null, fileName: transfer.fileName, bytes, failed: false };
}

function beginPdfTransfer(message: Extract<ConsultingWebMessage, { kind: 'pdf-begin' }>): PdfTransfer | null {
  if (!SAFE_ID.test(message.id) || message.chunkCount < 1 || message.chunkCount > MAX_CHUNKS) {
    return null;
  }
  return {
    id: message.id,
    fileName: consultingPdfFileName(message.fileName),
    chunkCount: message.chunkCount,
    chunks: Array.from({ length: message.chunkCount }, () => undefined),
    received: 0,
  };
}

function addPdfChunk(
  transfer: PdfTransfer,
  message: Extract<ConsultingWebMessage, { kind: 'pdf-chunk' }>,
): PdfTransfer {
  if (!canStoreChunk(transfer, message)) {
    return transfer;
  }
  const chunks = transfer.chunks.slice();
  chunks[message.index] = message.data;
  return { ...transfer, chunks, received: transfer.received + 1 };
}

function canStoreChunk(
  transfer: PdfTransfer,
  message: Extract<ConsultingWebMessage, { kind: 'pdf-chunk' }>,
): boolean {
  if (message.index < 0 || message.index >= transfer.chunkCount) {
    return false;
  }
  if (transfer.chunks[message.index] !== undefined) {
    return false;
  }
  return message.data.length <= MAX_CHUNK_LENGTH && message.data.length % 4 === 0 && BASE64_CHUNK.test(message.data);
}

function finishPdfTransfer(transfer: PdfTransfer): Uint8Array | null {
  if (transfer.received !== transfer.chunkCount) {
    return null;
  }
  try {
    return decodeBase64(transfer.chunks.join(''));
  } catch {
    return null;
  }
}

function decodeBase64(value: string): Uint8Array {
  const binary = globalThis.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index) & 0xff;
  }
  return bytes;
}

function readConsultingWebMessage(raw: string): ConsultingWebMessage | null {
  const value = parseJson(raw);
  if (!value || typeof value.type !== 'string') {
    return null;
  }
  return messageFromRecord(value.type, value);
}

function messageFromRecord(type: string, value: JsonRecord): ConsultingWebMessage | null {
  if (type === 'consulting-remote') {
    return typeof value.url === 'string' ? { kind: 'remote', url: value.url } : null;
  }
  if (type === 'consulting-pdf-error') {
    return { kind: 'pdf-error' };
  }
  if (type === 'consulting-pdf-begin') {
    return readBegin(value);
  }
  if (type === 'consulting-pdf-chunk') {
    return readChunk(value);
  }
  if (type === 'consulting-pdf-end' && typeof value.id === 'string') {
    return { kind: 'pdf-end', id: value.id };
  }
  return null;
}

function readBegin(value: JsonRecord): ConsultingWebMessage | null {
  if (typeof value.id !== 'string' || typeof value.fileName !== 'string') {
    return null;
  }
  if (typeof value.chunkCount !== 'number' || !Number.isInteger(value.chunkCount)) {
    return null;
  }
  return { kind: 'pdf-begin', id: value.id, fileName: value.fileName, chunkCount: value.chunkCount };
}

function readChunk(value: JsonRecord): ConsultingWebMessage | null {
  if (typeof value.id !== 'string' || typeof value.index !== 'number' || typeof value.data !== 'string') {
    return null;
  }
  if (!Number.isInteger(value.index)) {
    return null;
  }
  return { kind: 'pdf-chunk', id: value.id, index: value.index, data: value.data };
}

function parseHttpsUrl(rawUrl: string): URL | null {
  try {
    const url = new URL(rawUrl);
    return url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

function parseJson(raw: string): JsonRecord | null {
  try {
    const value = JSON.parse(raw) as unknown;
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }
    return value as JsonRecord;
  } catch {
    return null;
  }
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
