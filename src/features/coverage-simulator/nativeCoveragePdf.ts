import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { buildCoverageNativePdfHtml } from './coverageNativePdfHtml';
import { buildCoveragePdfFileName } from './coveragePdfFileName';
import type { CoverageScenario } from './types';

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
  let printUri: string;
  try {
    const result = await Print.printToFileAsync({ html });
    printUri = result.uri;
  } catch {
    throw new Error(
      'PDF 생성 모듈을 사용할 수 없습니다. 앱을 스토어에서 최신 버전으로 업데이트한 뒤 다시 시도해 주세요.',
    );
  }

  await assertValidPdfUri(printUri);

  const fileName = buildCoveragePdfFileName(scenario);
  const dest = new File(Paths.cache, fileName);
  dest.create({ overwrite: true });
  dest.write(await readPdfBytes(printUri));
  await assertValidPdfUri(dest.uri);

  return { uri: dest.uri, fileName };
}

export async function shareNativeCoveragePdf(scenario: CoverageScenario): Promise<void> {
  const { uri, fileName } = await createNativeCoveragePdfFile(scenario);
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('이 기기에서는 PDF 공유를 사용할 수 없습니다.');
  }
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: fileName,
    UTI: 'com.adobe.pdf',
  });
}
