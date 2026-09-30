import { File, Paths } from 'expo-file-system';

import { buildCoverageNativePdfHtml } from './coverageNativePdfHtml';
import { buildCoveragePdfFileName } from './coveragePdfFileName';
import {
  PDF_SAVE_REQUIRES_APP_UPDATE,
  assertPdfExportNativeModules,
  loadExpoPrint,
  loadExpoSharing,
} from './nativePdfModules';
import type { CoverageScenario } from './types';

const PDF_RENDER_FAILED_MESSAGE =
  'PDF 생성 모듈을 사용할 수 없습니다. 앱을 스토어에서 최신 버전으로 업데이트한 뒤 다시 시도해 주세요.';
const PDF_SHARE_UNAVAILABLE_MESSAGE = '이 기기에서는 PDF 공유를 사용할 수 없습니다.';

export function isPdfByteSignature(bytes: Uint8Array): boolean {
  if (bytes.byteLength < 5) return false;
  const head = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3], bytes[4]);
  return head.startsWith('%PDF-');
}

export async function readPdfBytes(uri: string): Promise<Uint8Array> {
  const file = new File(uri);
  if (!file.exists) {
    throw new Error('PDF 파일을 찾을 수 없습니다.');
  }
  return file.bytes();
}

export async function assertValidPdfUri(uri: string): Promise<void> {
  const bytes = await readPdfBytes(uri);
  if (bytes.byteLength === 0) {
    throw new Error('PDF 파일이 비어 있습니다.');
  }
  if (!isPdfByteSignature(bytes)) {
    throw new Error('PDF 형식이 올바르지 않습니다.');
  }
}

export async function createNativeCoveragePdfFile(
  scenario: CoverageScenario,
): Promise<{ uri: string; fileName: string }> {
  const html = buildCoverageNativePdfHtml(scenario);
  const printUri = await renderHtmlToPdfFile(html);
  await assertValidPdfUri(printUri);
  return writeNamedPdfCopy(scenario, printUri);
}

async function renderHtmlToPdfFile(html: string): Promise<string> {
  const print = loadExpoPrint();
  try {
    const result = await print.printToFileAsync({ html });
    return result.uri;
  } catch (error) {
    if (isAppUpdateRequired(error)) {
      throw error;
    }
    throw new Error(PDF_RENDER_FAILED_MESSAGE);
  }
}

function isAppUpdateRequired(error: unknown): boolean {
  return error instanceof Error && error.message === PDF_SAVE_REQUIRES_APP_UPDATE;
}

async function writeNamedPdfCopy(
  scenario: CoverageScenario,
  printUri: string,
): Promise<{ uri: string; fileName: string }> {
  const fileName = buildCoveragePdfFileName(scenario);
  const dest = new File(Paths.cache, fileName);
  dest.create({ overwrite: true });
  dest.write(await readPdfBytes(printUri));
  await assertValidPdfUri(dest.uri);
  return { uri: dest.uri, fileName };
}

export async function shareNativeCoveragePdf(scenario: CoverageScenario): Promise<void> {
  assertPdfExportNativeModules();
  const { uri, fileName } = await createNativeCoveragePdfFile(scenario);
  await sharePdfFile(uri, fileName);
}

async function sharePdfFile(uri: string, fileName: string): Promise<void> {
  const sharing = loadExpoSharing();
  if (!(await sharing.isAvailableAsync())) {
    throw new Error(PDF_SHARE_UNAVAILABLE_MESSAGE);
  }
  await sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: fileName,
    UTI: 'com.adobe.pdf',
  });
}
