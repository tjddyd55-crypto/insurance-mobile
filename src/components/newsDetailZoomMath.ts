export const NEWS_DETAIL_ZOOM_MIN = 1;
export const NEWS_DETAIL_ZOOM_MAX = 3;

export type PanBounds = {
  maxX: number;
  maxY: number;
};

export type Size = {
  width: number;
  height: number;
};

export function clampNewsDetailZoomScale(scale: number): number {
  'worklet';
  if (!Number.isFinite(scale)) {
    return NEWS_DETAIL_ZOOM_MIN;
  }
  return Math.min(NEWS_DETAIL_ZOOM_MAX, Math.max(NEWS_DETAIL_ZOOM_MIN, scale));
}

export function getScaledContentHeight(baseHeight: number, scale: number): number {
  'worklet';
  if (!Number.isFinite(baseHeight) || baseHeight <= 0) {
    return 0;
  }
  return baseHeight * clampNewsDetailZoomScale(scale);
}

/** Keeps the visual top edge anchored while scaling from the default center origin. */
export function getPageZoomTopOriginTranslateY(baseHeight: number, scale: number): number {
  'worklet';
  if (!Number.isFinite(baseHeight) || baseHeight <= 0 || scale <= NEWS_DETAIL_ZOOM_MIN) {
    return 0;
  }
  return (baseHeight * (clampNewsDetailZoomScale(scale) - NEWS_DETAIL_ZOOM_MIN)) / 2;
}

export function calculatePageZoomMaxScrollY({
  scaledContentHeight,
  viewportHeight,
  topPadding = 0,
  bottomPadding = 0,
}: {
  scaledContentHeight: number;
  viewportHeight: number;
  topPadding?: number;
  bottomPadding?: number;
}): number {
  if (scaledContentHeight <= 0 || viewportHeight <= 0) {
    return 0;
  }
  const totalContentHeight = topPadding + scaledContentHeight + bottomPadding;
  return Math.max(0, totalContentHeight - viewportHeight);
}

export function clampPageZoomScrollY(scrollY: number, maxScrollY: number): number {
  if (!Number.isFinite(scrollY)) {
    return 0;
  }
  return Math.min(Math.max(0, scrollY), Math.max(0, maxScrollY));
}

/**
 * `resizeMode="contain"` geometry for an image inside a viewport box.
 */
export function calculateContainRenderedSize(
  viewportWidth: number,
  viewportHeight: number,
  imageWidth: number,
  imageHeight: number,
): Size {
  if (viewportWidth <= 0 || viewportHeight <= 0 || imageWidth <= 0 || imageHeight <= 0) {
    return { width: 0, height: 0 };
  }

  const viewportAspect = viewportWidth / viewportHeight;
  const imageAspect = imageWidth / imageHeight;

  if (imageAspect > viewportAspect) {
    return {
      width: viewportWidth,
      height: viewportWidth / imageAspect,
    };
  }

  return {
    width: viewportHeight * imageAspect,
    height: viewportHeight,
  };
}

export function calculatePanBounds(
  renderedWidth: number,
  renderedHeight: number,
  scale: number,
  viewportWidth: number,
  viewportHeight: number,
): PanBounds {
  const scaledWidth = renderedWidth * scale;
  const scaledHeight = renderedHeight * scale;

  return {
    maxX: Math.max(0, (scaledWidth - viewportWidth) / 2),
    maxY: Math.max(0, (scaledHeight - viewportHeight) / 2),
  };
}

export function clampTranslation(
  translateX: number,
  translateY: number,
  bounds: PanBounds,
): { x: number; y: number } {
  'worklet';
  return {
    x: Math.min(bounds.maxX, Math.max(-bounds.maxX, translateX)),
    y: Math.min(bounds.maxY, Math.max(-bounds.maxY, translateY)),
  };
}
