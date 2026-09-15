import { Dimensions } from "react-native";

import type { AddressSearchValue } from "../features/customers/customerAddressSearch";

export function resolveAddressSearchModalHeight(windowHeight = Dimensions.get("window").height): number {
  return Math.round(windowHeight * 0.82);
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
