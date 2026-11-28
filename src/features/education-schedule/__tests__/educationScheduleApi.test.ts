import { apiRequest } from '../../../api/client';
import { analyzeEducationImage, bulkRegisterEducationSchedules, confirmEducationImageMonth } from '../educationScheduleApi';

jest.mock('../../../api/client');
jest.mock('expo-file-system', () => ({
  File: class {
    readonly uri: string;
    constructor(sourceUri: string) {
      this.uri = sourceUri;
    }
    async bytes() {
      return new Uint8Array([65, 66, 67]);
    }
  },
}));

const request = jest.mocked(apiRequest);

afterEach(() => request.mockReset());

test('uploads a picker file using a multipart part accepted by Expo and RN fetch', async () => {
  const { default: NativeFormData } = jest.requireActual<{ default: typeof FormData }>('react-native/Libraries/Network/FormData');
  const { installFormDataPatch } = jest.requireActual<{ installFormDataPatch(form: typeof FormData): void }>('expo/src/winter/FormData');
  const { convertFormDataAsync } = jest.requireActual<{
    convertFormDataAsync(body: FormData, boundary: string): Promise<{ body: Uint8Array }>;
  }>('expo/src/winter/fetch/convertFormData');
  const original = globalThis.FormData;
  installFormDataPatch(NativeFormData);
  globalThis.FormData = NativeFormData;
  try {
    request.mockResolvedValue({ rows: [] });
    const uri = 'file:///cache/DocumentPicker/image';
    await analyzeEducationImage('test-token', { uri, name: 'calendar', mimeType: 'image/png', lastModified: 0 });
    expect(request).toHaveBeenCalledWith('/api/education-schedules/ai/analyze', {
      method: 'POST', token: 'test-token', body: expect.any(NativeFormData), timeoutMs: 90_000,
    });
    const body = request.mock.calls[0][1]?.body as FormData & { getParts(): unknown[] };
    const serialized = await convertFormDataAsync(body, 'education-test-boundary');
    expect(String.fromCharCode(...serialized.body)).toBe(
      '--education-test-boundary\r\ncontent-disposition: form-data; name="file"; filename="calendar"\r\n' +
      'content-type: image/png\r\n\r\nABC\r\n--education-test-boundary--\r\n',
    );
    expect(body.getParts()).toEqual([{
      uri, name: 'calendar', type: 'image/png', fieldName: 'file',
      headers: { 'content-disposition': 'form-data; name="file"; filename="calendar"', 'content-type': 'image/png' },
    }]);
    expect(Object.keys(body.getParts()[0] as object)).not.toContain('bytes');
  } finally {
    globalThis.FormData = original;
  }
});

test('posts the draft and confirmed month before sending only reviewed rows to bulk registration', async () => {
  const draft = { year: null, month: 12, rows: [] };
  const row = { date: '2026-12-03', title: '교육', instructor: '' };
  await confirmEducationImageMonth('test-token', '2026-12', draft);
  await bulkRegisterEducationSchedules('test-token', [row]);
  expect(request).toHaveBeenNthCalledWith(1, '/api/education-schedules/ai/analyze?yearMonth=2026-12', {
    token: 'test-token', method: 'POST', body: JSON.stringify({ draft }),
  });
  expect(request).toHaveBeenNthCalledWith(2, '/api/education-schedules/bulk', {
    token: 'test-token', method: 'POST', body: JSON.stringify({ rows: [row] }),
  });
});
