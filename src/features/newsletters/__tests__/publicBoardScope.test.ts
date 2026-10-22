// @ts-nocheck
const fs = require('fs');
const path = require('path');
import { resolveNewsletterListGaBadge } from '../newslettersModel';

const read = (f: string) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

describe('public board (공용게시판) GA scope', () => {
  it('A: global board header shows no current GA name', () => {
    expect(resolveNewsletterListGaBadge({ isBoard: true, boardScope: 'global', gaName: '영진에셋' })).toBeNull();
    expect(resolveNewsletterListGaBadge({ isBoard: true, boardScope: null, gaName: '영진에셋' })).toBeNull();
  });
  it('E: different GA logins get the same (no) chip on global board', () => {
    for (const ga of ['영진에셋', '다른GA', '공용']) {
      expect(resolveNewsletterListGaBadge({ isBoard: true, boardScope: 'global', gaName: ga })).toBeNull();
    }
  });
  it('GA-only board and channel feed keep existing GA chip', () => {
    expect(resolveNewsletterListGaBadge({ isBoard: true, boardScope: 'ga', gaName: '영진에셋' })).toBe('영진에셋');
    expect(resolveNewsletterListGaBadge({ isBoard: false, gaName: '영진에셋' })).toBe('영진에셋');
  });
  it('screen no longer renders user.gaName directly', () => {
    expect(read('NewslettersScreen.tsx')).not.toMatch(/label=\{user\.gaName\}/);
  });
  it('B: board feed/detail requests carry no gaCode/gaId', () => {
    const api = read('newslettersApi.ts');
    const feed = api.slice(api.indexOf('getBoardNewsletterFeed'), api.indexOf('getBoardNewsletter('));
    const detail = api.slice(api.indexOf('getBoardNewsletter('));
    for (const src of [feed, detail]) {
      expect(src).not.toMatch(/gaCode|gaId|agencyId/);
    }
  });
  it('board query key has no GA; count/search use the same loaded list', () => {
    const s = read('NewslettersScreen.tsx');
    expect(s).toMatch(/queryKey: \['newsletters', 'board', boardSlug\]/);
    expect(s).toMatch(/label=\{`\$\{items\.length\}건`\}/);
  });
});
