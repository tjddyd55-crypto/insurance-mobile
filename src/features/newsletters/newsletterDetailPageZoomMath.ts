export type NewsletterDetailPageZoomLayout = {
  logicalWidth: number;
  marginBottom: number;
};

/**
 * The child keeps its baseline width so images and text scale together. Its
 * bottom margin exposes the transformed visual height to the parent ScrollView
 * without a separate spacer view.
 */
export function calculateNewsletterDetailPageZoomLayout(
  availableWidth: number,
  contentHeight: number,
  scale: number,
): NewsletterDetailPageZoomLayout {
  'worklet';
  if (
    !Number.isFinite(availableWidth) ||
    !Number.isFinite(contentHeight) ||
    !Number.isFinite(scale) ||
    availableWidth <= 0 ||
    contentHeight < 0 ||
    scale < 1
  ) {
    return {
      logicalWidth: Math.max(0, Number.isFinite(availableWidth) ? availableWidth : 0),
      marginBottom: 0,
    };
  }

  return {
    logicalWidth: availableWidth,
    marginBottom: contentHeight * (scale - 1),
  };
}
