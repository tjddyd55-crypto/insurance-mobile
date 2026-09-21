/**
 * 소식지 목록 썸네일 비율 SSOT.
 * NewsletterGridCard 의 newsletterImageFrame 만 이 값을 사용한다.
 * 상세 갤러리는 원본 이미지 비율을 사용하며 이 상수를 적용하지 않는다.
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
