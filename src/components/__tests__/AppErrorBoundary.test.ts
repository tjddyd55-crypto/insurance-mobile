import { AppErrorBoundary } from '../AppErrorBoundary';

describe('AppErrorBoundary', () => {
  it('derives error state from a thrown error', () => {
    const error = new Error('boom');
    expect(AppErrorBoundary.getDerivedStateFromError(error)).toEqual({ error });
  });

  it('starts with no error state', () => {
    const boundary = new AppErrorBoundary({ children: null });
    expect(boundary.state.error).toBeNull();
  });
});
