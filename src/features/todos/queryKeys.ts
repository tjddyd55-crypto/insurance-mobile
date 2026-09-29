import type { ListTodosParams } from './types';

export const todoQueryKeys = {
  all: ['todos'] as const,
  list: (params: ListTodosParams) => ['todos', 'list', params] as const,
};
