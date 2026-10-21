import { useLocalSearchParams } from 'expo-router';

import { TodoFormScreen } from '../../../src/features/todos/TodoFormScreen';
import { todoEditScreenId } from '../../../src/features/todos/todoNavigation';
import { validWidgetDate } from '../../../src/features/home-widgets/widgetLinks';

export default function NewTodoRoute() {
  const params = useLocalSearchParams<{ consultationId?: string | string[]; dueDate?: string | string[] }>();
  return (
    <TodoFormScreen
      mode="create"
      consultationId={todoEditScreenId(params.consultationId)}
      dueDate={validWidgetDate(params.dueDate)}
    />
  );
}
