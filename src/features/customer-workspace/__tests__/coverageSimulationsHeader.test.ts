// @ts-nocheck
import fs from 'fs';
import path from 'path';

describe('CustomerCoverageSimulationsScreen header (P2 #12)', () => {
  it('AppHeader sits outside the padded Screen (single header, list-screen pattern)', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'CustomerCoverageSimulationsScreen.tsx'), 'utf8');
    expect(src).toMatch(/<View style=\{styles\.root\}>\s*<AppHeader[^>]*\/>\s*<Screen padded=\{false\}>/);
    expect(src).not.toMatch(/<Screen>\s*<AppHeader/);
  });
});
