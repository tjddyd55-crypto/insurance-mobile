import {
  ADDRESS_SEARCH_EMBED_MAX_HEIGHT_RATIO,
  ADDRESS_SEARCH_PANEL_WIDTH_RATIO,
  resolveAddressSearchEmbedHeight,
  resolveAddressSearchPanelWidth,
} from "../addressSearchUi";
import { parseAddressSearchWebViewMessage } from "../addressSearchPostcode";

describe("address search shared UI (platform parity)", () => {
  it("matches web panel width min(640px, 92vw)", () => {
    expect(resolveAddressSearchPanelWidth(360)).toBe(Math.round(360 * ADDRESS_SEARCH_PANEL_WIDTH_RATIO));
    expect(resolveAddressSearchPanelWidth(800)).toBe(640);
  });

  it("caps embed height around 68~72vh on phones", () => {
    const narrow = resolveAddressSearchEmbedHeight(700, 360);
    expect(narrow).toBeLessThanOrEqual(Math.round(700 * ADDRESS_SEARCH_EMBED_MAX_HEIGHT_RATIO));
    expect(narrow).toBeGreaterThanOrEqual(320);
  });

  it("parses postcode completion payload", () => {
    const result = parseAddressSearchWebViewMessage(
      JSON.stringify({
        type: "complete",
        zonecode: "06236",
        baseAddress: "서울특별시 강남구 테헤란로 152",
      }),
    );
    expect(result).toEqual({
      action: "complete",
      value: {
        zonecode: "06236",
        baseAddress: "서울특별시 강남구 테헤란로 152",
      },
    });
  });

  it("closes safely on invalid payload", () => {
    expect(parseAddressSearchWebViewMessage("{bad").action).toBe("close");
    expect(parseAddressSearchWebViewMessage(JSON.stringify({ type: "noop" })).action).toBe(
      "ignore",
    );
  });
});
