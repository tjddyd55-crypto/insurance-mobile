import { sanitizeAndroidDownloadBaseName } from "../androidDownloadsSave";

describe("sanitizeAndroidDownloadBaseName", () => {
  it("strips extension and unsafe characters", () => {
    expect(sanitizeAndroidDownloadBaseName("고객-보험청구-62.pdf")).toBe(
      "고객-보험청구-62",
    );
    expect(sanitizeAndroidDownloadBaseName('bad:name?.pdf')).toBe("bad_name_");
  });
});
