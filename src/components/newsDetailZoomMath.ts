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
  'worklet';
  if (
    !Number.isFinite(renderedWidth) ||
    !Number.isFinite(renderedHeight) ||
    !Number.isFinite(scale) ||
    !Number.isFinite(viewportWidth) ||
    !Number.isFinite(viewportHeight) ||
    renderedWidth <= 0 ||
    renderedHeight <= 0 ||
    scale <= 0 ||
    viewportWidth <= 0 ||
    viewportHeight <= 0
  ) {
    return { maxX: 0, maxY: 0 };
  }

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
  const maxX = Number.isFinite(bounds.maxX) && bounds.maxX > 0 ? bounds.maxX : 0;
  const maxY = Number.isFinite(bounds.maxY) && bounds.maxY > 0 ? bounds.maxY : 0;
  const safeTranslateX = Number.isFinite(translateX) ? translateX : 0;
  const safeTranslateY = Number.isFinite(translateY) ? translateY : 0;

  return {
    x: Math.min(maxX, Math.max(-maxX, safeTranslateX)),
    y: Math.min(maxY, Math.max(-maxY, safeTranslateY)),
  };
}
