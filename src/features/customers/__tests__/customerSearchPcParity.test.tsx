import React from 'react';
import { Text } from 'react-native';
import { act, render } from '@testing-library/react-native';

import {
  CUSTOMER_SEARCH_DEBOUNCE_MS,
  customerMatchesNamePhoneKeyword as match,
  useDebouncedSearch,
} from '../customerKeywordMatch';

declare const __dirname: string;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path');

const kim = { name: '김 민수', phone: '010-1234-5678' };

describe('customer search — PC parity (name + phone)', () => {
  it('partial name (공백/대소문자 무시)', () => {
    expect(match(kim, '민')).toBe(true);
    expect(match(kim, '김민')).toBe(true);
    expect(match({ name: 'John Doe', phone: '' }, 'jOhNd')).toBe(true);
    expect(match(kim, '박')).toBe(false);
  });
  it('phone prefix / middle / suffix, with or without hyphen', () => {
    expect(match(kim, '010')).toBe(true);
    expect(match(kim, '1234')).toBe(true);
    expect(match(kim, '5678')).toBe(true);
    expect(match(kim, '01012345678')).toBe(true);
    expect(match(kim, '010-1234')).toBe(true);
    expect(match(kim, '4-56')).toBe(true);
    expect(match(kim, '9999')).toBe(false);
  });
  it('empty keyword matches all; non-name non-digit text does not hit phone', () => {
    expect(match(kim, '')).toBe(true);
    expect(match(kim, '   ')).toBe(true);
    expect(match(kim, '서울')).toBe(false);
  });
});

function Probe({ value }: { value: string }) {
  return <Text testID="out">{useDebouncedSearch(value)}</Text>;
}

describe('useDebouncedSearch — realtime typing without submit', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('applies last value after 180ms, clear applies immediately', () => {
    expect(CUSTOMER_SEARCH_DEBOUNCE_MS).toBe(180);
    const view = render(<Probe value="" />);
    const out = () => view.getByTestId('out').props.children;
    view.rerender(<Probe value="김" />);
    view.rerender(<Probe value="김민" />);
    act(() => jest.advanceTimersByTime(179));
    expect(out()).toBe('');
    act(() => jest.advanceTimersByTime(1));
    expect(out()).toBe('김민');
    // backspace
    view.rerender(<Probe value="김" />);
    act(() => jest.advanceTimersByTime(180));
    expect(out()).toBe('김');
    // stale typing cancelled by clear
    view.rerender(<Probe value="김민수" />);
    view.rerender(<Probe value="" />);
    expect(out()).toBe('');
    act(() => jest.advanceTimersByTime(500));
    expect(out()).toBe('');
  });
});

describe('CustomersScreen wiring', () => {
  const src: string = fs.readFileSync(path.join(__dirname, '..', 'CustomersScreen.tsx'), 'utf8');
  it('uses debounced draft, no search button / submit-only state', () => {
    expect(src).toContain('useDebouncedSearch(searchDraft.trim())');
    expect(src).toContain('showSearchButton={false}');
    expect(src).not.toMatch(/setSearch\(/);
  });
});
