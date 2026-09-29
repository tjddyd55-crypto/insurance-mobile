import { createTodo, deleteTodo, listTodos, updateTodo } from '../todosApi';

jest.mock('../../../api/client', () => ({
  ApiError: class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
  apiRequest: jest.fn(),
}));

const { apiRequest } = jest.requireMock('../../../api/client');

describe('todosApi', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('lists todos', async () => {
    (apiRequest as jest.Mock).mockResolvedValue({
      data: [
        {
          id: '1',
          title: '할 일',
          description: '할 일',
          status: 'pending',
          dueDate: '2026-09-18',
        },
      ],
    });
    const rows = await listTodos('token');
    expect(rows[0].description).toBe('할 일');
    expect(apiRequest).toHaveBeenCalledWith('/api/todos', { token: 'token' });
  });

  it('creates todo with optional due date', async () => {
    (apiRequest as jest.Mock).mockResolvedValue({
      id: '2',
      description: '신규',
      status: 'pending',
      dueDate: null,
    });
    await createTodo('token', {
      title: '신규',
      description: '신규',
      dueDate: null,
      dueTime: null,
      priority: 'normal',
      relatedEntityType: null,
      relatedEntityId: null,
    });
    expect(apiRequest).toHaveBeenCalledWith(
      '/api/todos',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"dueDate":null'),
      }),
    );
  });

  it('updates and deletes todos', async () => {
    (apiRequest as jest.Mock).mockResolvedValue({
      id: '3',
      description: '수정',
      status: 'pending',
      dueDate: '2026-09-20',
    });
    await updateTodo('token', '3', { description: '수정', dueDate: '2026-09-20' });
    expect(apiRequest).toHaveBeenCalledWith(
      '/api/todos/3',
      expect.objectContaining({ method: 'PATCH' }),
    );

    (apiRequest as jest.Mock).mockResolvedValue(undefined);
    await deleteTodo('token', '3');
    expect(apiRequest).toHaveBeenCalledWith(
      '/api/todos/3',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});
