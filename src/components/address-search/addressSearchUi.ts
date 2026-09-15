import { Dimensions } from "react-native";

/**
 * Platform `address-search-field__*` CSS 와 동일한 레이아웃 SSOT.
 * @see insurance/src/index.css (.address-search-field__dialog, __embed)
 */
export const ADDRESS_SEARCH_PANEL_PADDING = 16;
export const ADDRESS_SEARCH_PANEL_GAP = 10;
export const ADDRESS_SEARCH_PANEL_WIDTH_RATIO = 0.94;
export const ADDRESS_SEARCH_PANEL_MAX_WIDTH = 640;

export const ADDRESS_SEARCH_EMBED_HEIGHT = 560;
export const ADDRESS_SEARCH_EMBED_MAX_HEIGHT_RATIO = 0.7;
export const ADDRESS_SEARCH_EMBED_MIN_HEIGHT = 360;
export const ADDRESS_SEARCH_EMBED_MIN_HEIGHT_NARROW = 320;
export const ADDRESS_SEARCH_EMBED_HEIGHT_NARROW_RATIO = 0.6;
export const ADDRESS_SEARCH_NARROW_WIDTH = 480;

export function resolveAddressSearchPanelWidth(
  windowWidth = Dimensions.get("window").width,
): number {
  return Math.min(
    ADDRESS_SEARCH_PANEL_MAX_WIDTH,
    Math.round(windowWidth * ADDRESS_SEARCH_PANEL_WIDTH_RATIO),
  );
}

/** Web `.address-search-field__embed` 높이 규칙 (desktop 560px / mobile 60vh, max 70vh). */
export function resolveAddressSearchEmbedHeight(
  windowHeight = Dimensions.get("window").height,
  windowWidth = Dimensions.get("window").width,
): number {
  const isNarrow = windowWidth <= ADDRESS_SEARCH_NARROW_WIDTH;
  const preferred = isNarrow
    ? Math.round(windowHeight * ADDRESS_SEARCH_EMBED_HEIGHT_NARROW_RATIO)
    : ADDRESS_SEARCH_EMBED_HEIGHT;
  const maxHeight = Math.round(windowHeight * ADDRESS_SEARCH_EMBED_MAX_HEIGHT_RATIO);
  const minHeight = isNarrow
    ? ADDRESS_SEARCH_EMBED_MIN_HEIGHT_NARROW
    : ADDRESS_SEARCH_EMBED_MIN_HEIGHT;
  return Math.max(minHeight, Math.min(preferred, maxHeight));
}
