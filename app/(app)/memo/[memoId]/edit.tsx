import { useLocalSearchParams } from 'expo-router';

import { ErrorState } from '../../../../src/components/ErrorState';
import { MemoFormScreen } from '../../../../src/features/memos/MemoFormScreen';

export default function EditMemoRoute() {
  const { memoId } = useLocalSearchParams<{ memoId?: string }>();
  if (!memoId?.trim()) return <ErrorState title="잘못된 메모 주소입니다" message="메모 id를 확인해 주세요." />;
  return <MemoFormScreen mode="edit" memoId={memoId} />;
}
