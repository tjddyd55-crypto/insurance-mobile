import { sortTodosByRecentWrite } from '../../todos/todoModel';
import { listTodos } from '../../todos/todosApi';
import type { TodoRecord } from '../../todos/types';
import { buildWidgetDeepLink } from '../engine/widgetDeepLink';
import { clipWidgetTitle, type WidgetAdapter } from './adapterTypes';
import { widgetWindow } from './widgetWindow';

export type WidgetTodoItem = { id: string; title: string; completed: boolean; link: string };
export type WidgetTodoDay = { date: string; items: WidgetTodoItem[] };

/** 할 일 위젯 payload(v1). */
export type TodoWidgetPayload = {
  visibleRange: { from: string; to: string };
  selectedDate: string;
  todos: WidgetTodoDay[];
};

/** 앱 할 일 화면과 같은 데이터(ONE FC 할 일만)·정렬. 취소·날짜 없음 제외. 설명(연락처 등)은 넣지 않는다. */
export function buildTodoDays(todos: readonly TodoRecord[], scheme: string, from: string, to: string): WidgetTodoDay[] {
  const byDate = new Map<string, TodoRecord[]>();
  for (const todo of todos) {
    const due = todo.dueDate?.slice(0, 10) ?? '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(due) || due < from || due > to || todo.status === 'canceled') continue;
    byDate.set(due, [...(byDate.get(due) ?? []), todo]);
  }
  return [...byDate.keys()].sort().map((date) => ({
    date,
    items: sortTodosByRecentWrite(byDate.get(date) ?? []).map((todo) => ({
      id: todo.id,
      title: clipWidgetTitle(todo.title),
      completed: todo.status === 'completed',
      link: buildWidgetDeepLink(scheme, 'todo', 'edit', { id: todo.id }) ?? '',
    })),
  }));
}

export const todoWidgetAdapter: WidgetAdapter<TodoWidgetPayload> = {
  async load({ token, scheme, today }) {
    const range = widgetWindow(today);
    return { visibleRange: range, selectedDate: today, todos: buildTodoDays(await listTodos(token), scheme, range.from, range.to) };
  },
};
