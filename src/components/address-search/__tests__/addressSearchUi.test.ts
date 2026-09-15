import {
  ADDRESS_SEARCH_EMBED_HEIGHT,
  ADDRESS_SEARCH_EMBED_MAX_HEIGHT_RATIO,
  ADDRESS_SEARCH_PANEL_WIDTH_RATIO,
  resolveAddressSearchEmbedHeight,
  resolveAddressSearchPanelWidth,
} from "../addressSearchUi";
import { parseAddressSearchWebViewMessage } from "../addressSearchPostcode";

describe("address search shared UI (platform parity)", () => {
  it("matches web panel width min(640px, 94vw)", () => {
    expect(resolveAddressSearchPanelWidth(360)).toBe(Math.round(360 * ADDRESS_SEARCH_PANEL_WIDTH_RATIO));
    expect(resolveAddressSearchPanelWidth(800)).toBe(640);
  });

  it("matches web embed height rules (560px desktop, 60vh narrow, max 70vh)", () => {
    expect(resolveAddressSearchEmbedHeight(800, 800)).toBe(
      Math.min(ADDRESS_SEARCH_EMBED_HEIGHT, Math.round(800 * ADDRESS_SEARCH_EMBED_MAX_HEIGHT_RATIO)),
    );
    expect(resolveAddressSearchEmbedHeight(700, 360)).toBe(
      Math.min(Math.round(700 * 0.6), Math.round(700 * ADDRESS_SEARCH_EMBED_MAX_HEIGHT_RATIO)),
    );
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
