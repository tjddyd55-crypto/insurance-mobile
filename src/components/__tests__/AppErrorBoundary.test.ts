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

  it('replaces prior error when a new error is derived', () => {
    const first = new Error('first');
    const second = new Error('second');
    expect(AppErrorBoundary.getDerivedStateFromError(first)).toEqual({ error: first });
    expect(AppErrorBoundary.getDerivedStateFromError(second)).toEqual({ error: second });
  });
});
