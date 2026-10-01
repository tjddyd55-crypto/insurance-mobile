import { useLocalSearchParams } from 'expo-router';

import { TodoFormScreen } from '../../../src/features/todos/TodoFormScreen';
import { todoEditScreenId } from '../../../src/features/todos/todoNavigation';

export default function NewTodoRoute() {
  const params = useLocalSearchParams<{ consultationId?: string | string[] }>();
  return <TodoFormScreen mode="create" consultationId={todoEditScreenId(params.consultationId)} />;
}
