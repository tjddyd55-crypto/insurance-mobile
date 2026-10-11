import { sanitizeAndroidDownloadDisplayName } from "../androidDownloadsSave";

jest.mock("onefc-android-downloads", () => ({
  saveLocalFileToAndroidDownloads: jest.fn(),
}));

describe("sanitizeAndroidDownloadDisplayName", () => {
  it("keeps extension and removes unsafe characters", () => {
    expect(sanitizeAndroidDownloadDisplayName("고객-보험청구-62.pdf")).toBe(
      "고객-보험청구-62.pdf",
    );
    expect(sanitizeAndroidDownloadDisplayName('bad:name?.pdf')).toBe(
      "bad_name_.pdf",
    );
  });

  it("appends .pdf when missing", () => {
    expect(sanitizeAndroidDownloadDisplayName("청구서_홍길동_20261011")).toBe(
      "청구서_홍길동_20261011.pdf",
    );
  });
});
