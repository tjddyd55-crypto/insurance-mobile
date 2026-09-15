import { Dimensions } from "react-native";

import type { AddressSearchValue } from "../features/customers/customerAddressSearch";

const ADDRESS_MODAL_HEADER_CHROME = 96;
const ADDRESS_MODAL_MIN_WEBVIEW_HEIGHT = 320;

export function resolveAddressSearchModalHeight(windowHeight = Dimensions.get("window").height): number {
  const dialogContentCap = Math.round(windowHeight * 0.9 - ADDRESS_MODAL_HEADER_CHROME);
  const preferred = Math.round(windowHeight * 0.62);
  return Math.max(
    ADDRESS_MODAL_MIN_WEBVIEW_HEIGHT,
    Math.min(preferred, dialogContentCap),
  );
}

export function parseAddressSearchWebViewMessage(
  raw: string,
  currentDetailAddress: string,
): { action: "complete" | "close" | "ignore"; value?: AddressSearchValue } {
  try {
    const payload = JSON.parse(raw) as {
      type?: string;
      zonecode?: string;
      baseAddress?: string;
    };
    if (payload.type === "complete") {
      return {
        action: "complete",
        value: {
          zonecode: String(payload.zonecode ?? ""),
          baseAddress: String(payload.baseAddress ?? ""),
          detailAddress: currentDetailAddress,
        },
      };
    }
    if (payload.type === "close") {
      return { action: "close" };
    }
    return { action: "ignore" };
  } catch {
    return { action: "close" };
  }
}
