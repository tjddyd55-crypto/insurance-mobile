import { useLocalSearchParams } from 'expo-router';

import { ErrorState } from '../../../../src/components/ErrorState';
import { TodoFormScreen } from '../../../../src/features/todos/TodoFormScreen';

export default function EditTodoRoute() {
  const { todoId } = useLocalSearchParams<{ todoId?: string }>();
  if (!todoId?.trim()) {
    return <ErrorState title="잘못된 할 일 주소입니다" message="할 일 id를 확인해 주세요." />;
  }
  return <TodoFormScreen mode="edit" todoId={todoId} />;
}
