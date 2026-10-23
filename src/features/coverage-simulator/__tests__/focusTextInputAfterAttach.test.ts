import { focusTextInputAfterAttach } from '../focusTextInputAfterAttach';

type FrameHost = { requestAnimationFrame: typeof requestAnimationFrame };

describe('focusTextInputAfterAttach', () => {
  const host = globalThis as unknown as FrameHost;
  const originalFrame = host.requestAnimationFrame;

  afterEach(() => {
    host.requestAnimationFrame = originalFrame;
  });

  it('does not focus in the same turn, then focuses on the second frame', () => {
    const frames: Array<() => void> = [];
    host.requestAnimationFrame = ((callback: FrameRequestCallback) => {
      frames.push(() => callback(0));
      return frames.length;
    }) as typeof requestAnimationFrame;

    const focus = jest.fn();
    focusTextInputAfterAttach({ focus });

    expect(focus).not.toHaveBeenCalled();
    frames.shift()?.();
    expect(focus).not.toHaveBeenCalled();
    frames.shift()?.();
    expect(focus).toHaveBeenCalledTimes(1);
  });
});
