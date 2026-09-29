import { resolveApiUrl } from "../../../api/client";
import { claimBundleDownloadPath, claimBundleRequest } from "../claimsApi";

const PRODUCTION_API = "https://insurance-production-7bd8.up.railway.app";

describe("claim bundle download", () => {
  it("uses the same Bearer GET path as the PC client", () => {
    expect(claimBundleDownloadPath(62, 9, "pdf")).toBe(
      "/api/agent/customer-claim-requests/62/files.pdf?customerId=9",
    );
    expect(claimBundleDownloadPath(62, 9, "zip")).toBe(
      "/api/agent/customer-claim-requests/62/files.zip?customerId=9",
    );
  });

  it("resolves that path on the production HTTPS API and omits the signed http URL", () => {
    const pdf = resolveApiUrl(claimBundleDownloadPath(62, 9, "pdf"), PRODUCTION_API);
    const zip = resolveApiUrl(claimBundleDownloadPath(62, 9, "zip"), PRODUCTION_API);

    expect(pdf).toBe(
      `${PRODUCTION_API}/api/agent/customer-claim-requests/62/files.pdf?customerId=9`,
    );
    expect(zip).toBe(
      `${PRODUCTION_API}/api/agent/customer-claim-requests/62/files.zip?customerId=9`,
    );
    expect(pdf.startsWith("http://")).toBe(false);
    expect(pdf).not.toContain("accessToken");
    expect(pdf).not.toContain("bundle-download-url");
  });

  it("sends the session bearer and refuses a missing login", () => {
    const request = claimBundleRequest(" agent-token ", 62, 9, "pdf");

    expect(request.url.startsWith("https://")).toBe(true);
    expect(request.url).toContain(
      "/api/agent/customer-claim-requests/62/files.pdf?customerId=9",
    );
    expect(request.headers.Authorization).toBe("Bearer agent-token");
    expect(() => claimBundleRequest("  ", 62, 9, "zip")).toThrow(
      "로그인이 필요합니다.",
    );
  });
});
