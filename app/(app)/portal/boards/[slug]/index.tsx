import { useLocalSearchParams } from 'expo-router';

import { ErrorState } from '../../../../../src/components/ErrorState';
import { NewslettersScreen } from '../../../../../src/features/newsletters/NewslettersScreen';

export default function Screen() {
  const params = useLocalSearchParams<{ slug?: string | string[] }>();
  const raw = params.slug;
  const slug = Array.isArray(raw) ? raw[0] : raw;
  const value = String(slug ?? '').trim();
  if (!value) {
    return (
      <ErrorState
        title="게시판을 찾을 수 없습니다"
        message="지원되지 않거나 잘못된 소식지 게시판 주소입니다."
      />
    );
  }
  return <NewslettersScreen mode="board" boardSlug={value} />;
}
