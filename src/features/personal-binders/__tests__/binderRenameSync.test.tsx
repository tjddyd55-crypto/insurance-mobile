/// <reference types="node" />
import fs from 'fs';
import path from 'path';
import { act, renderHook } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useBinderFocusRefresh } from '../useBinderFocusRefresh';
import { personalBinderQueryKeys as keys } from '../queryKeys';

let mockFocus: () => void;
jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => void) => { mockFocus = callback; },
}));

it('invalidates cached materials, detail and viewer pages on every navigation focus', async () => {
  const client = new QueryClient();
  const queryKeys = [keys.all, keys.materials, keys.detail('b1'), keys.pages('b1')];
  queryKeys.forEach((queryKey) => client.setQueryData(queryKey, { title: 'old' }));
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const hook = renderHook<void, { enabled: boolean }>(({ enabled }) => useBinderFocusRefresh(enabled), { wrapper, initialProps: { enabled: true } });
  for (let focus = 0; focus < 2; focus++) {
    queryKeys.forEach((queryKey) => client.setQueryData(queryKey, { title: 'old' }));
    await act(async () => { mockFocus(); });
    queryKeys.forEach((queryKey) => expect(client.getQueryState(queryKey)?.isInvalidated).toBe(true));
  }
  hook.rerender({ enabled: false });
  queryKeys.forEach((queryKey) => client.setQueryData(queryKey, {}));
  await act(async () => { mockFocus(); });
  queryKeys.forEach((queryKey) => expect(client.getQueryState(queryKey)?.isInvalidated).toBe(false));
  hook.unmount();
  client.clear();
});

it('keeps original upload names out of every binder UI and wires focus refresh', () => {
  const dir = path.join(__dirname, '..');
  for (const file of fs.readdirSync(dir).filter((name) => name.endsWith('.tsx'))) {
    const source = fs.readFileSync(path.join(dir, file), 'utf8');
    expect(source).not.toContain('originalFileName');
    if (['BinderListScreen.tsx', 'BinderEditorScreen.tsx', 'BinderViewerScreen.tsx'].includes(file)) {
      expect(source).toContain('useBinderFocusRefresh(Boolean(token))');
    }
  }
  const editor = fs.readFileSync(path.join(dir, 'BinderEditorScreen.tsx'), 'utf8');
  expect(editor).toContain('{item.material.title}');
  expect(editor).toContain('{material.title}');
  expect(editor).toContain('?.title ?? pageTarget?.material.title');
});
