import { useLocalSearchParams } from 'expo-router';

import { ErrorState } from '../../../../src/components/ErrorState';
import { TodoFormScreen } from '../../../../src/features/todos/TodoFormScreen';
import { todoEditScreenId } from '../../../../src/features/todos/todoNavigation';

export default function EditTodoRoute() {
  const params = useLocalSearchParams<{ todoId?: string | string[] }>();
  const todoId = todoEditScreenId(params.todoId);
  if (!todoId) {
    return <ErrorState title="잘못된 할 일 주소입니다" message="할 일 id를 확인해 주세요." />;
  }
  return <TodoFormScreen mode="edit" todoId={todoId} />;
}
