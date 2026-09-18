export const NEWS_DETAIL_IMAGE_MIN_SCALE = 1;
export const NEWS_DETAIL_IMAGE_MAX_SCALE = 3;

export function clampNewsDetailImageScale(value: number): number {
  'worklet';
  return Math.min(NEWS_DETAIL_IMAGE_MAX_SCALE, Math.max(NEWS_DETAIL_IMAGE_MIN_SCALE, value));
}
