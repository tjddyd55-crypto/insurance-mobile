/**
 * 소식지 목록 썸네일 프레임 SSOT.
 * 2열 카드 높이를 맞추기 위해 NewsletterGridCard 만 이 비율을 쓴다.
 * 상세 갤러리는 원본 비율을 쓰며 이 상수를 적용하지 않는다.
 */
export const NEWSLETTER_IMAGE_ASPECT_RATIO = 3 / 4;

export function resolveNewsletterDetailImageAspectRatio(
  width: number,
  height: number,
): number | null {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }

  return width / height;
}
