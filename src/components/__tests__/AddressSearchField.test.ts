import {
  parseAddressSearchWebViewMessage,
  resolveAddressSearchModalHeight,
} from "../addressSearchModal";

describe("AddressSearchField modal helpers", () => {
  it("fits WebView height inside dialog panel without exceeding 90% window", () => {
    expect(resolveAddressSearchModalHeight(800)).toBe(496);
    expect(resolveAddressSearchModalHeight(360)).toBe(320);
  });

  it("parses postcode completion without changing detail address", () => {
    const result = parseAddressSearchWebViewMessage(
      JSON.stringify({
        type: "complete",
        zonecode: "06236",
        baseAddress: "서울특별시 강남구 테헤란로 152",
      }),
      "101호",
    );
    expect(result).toEqual({
      action: "complete",
      value: {
        zonecode: "06236",
        baseAddress: "서울특별시 강남구 테헤란로 152",
        detailAddress: "101호",
      },
    });
  });

  it("closes modal on close message and ignores invalid payload safely", () => {
    expect(parseAddressSearchWebViewMessage(JSON.stringify({ type: "close" }), "").action).toBe(
      "close",
    );
    expect(parseAddressSearchWebViewMessage("{bad json", "").action).toBe("close");
    expect(parseAddressSearchWebViewMessage(JSON.stringify({ type: "noop" }), "").action).toBe(
      "ignore",
    );
  });
});
