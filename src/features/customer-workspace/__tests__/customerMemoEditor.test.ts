// @ts-nocheck
import { shouldCloseMemoEditor } from '../customerMemoEditor';

import fs from 'fs';
import path from 'path';

describe('shouldCloseMemoEditor (P1-3)', () => {
  it('closes after a successful save even though the mutation is still pending', () => {
    expect(shouldCloseMemoEditor('saved', true)).toBe(true);
    expect(shouldCloseMemoEditor('saved', false)).toBe(true);
  });
  it('blocks user close while saving, allows it otherwise', () => {
    expect(shouldCloseMemoEditor('user', true)).toBe(false);
    expect(shouldCloseMemoEditor('user', false)).toBe(true);
  });
  it('CustomerMemosScreen onSuccess closes with the saved reason', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'CustomerMemosScreen.tsx'), 'utf8');
    expect(src).toMatch(/onSuccess: async \(\) => \{\s*closeEditor\('saved'\);/);
    expect(src).not.toMatch(/if \(save\.isPending\) return;/);
  });
});
