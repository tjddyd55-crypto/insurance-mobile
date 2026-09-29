import {
  applyFormInputFormat,
  formatKoreanMobilePhone,
  formatKoreanResidentNumber,
  normalizeDigits,
  stripPhoneFormatting,
  stripResidentNumberFormatting,
} from '../inputFormatters';

describe('normalizeDigits', () => {
  it('strips non-digits and respects maxLength', () => {
    expect(normalizeDigits('010-1234-5678')).toBe('01012345678');
    expect(normalizeDigits('010.1234.5678abc', 11)).toBe('01012345678');
    expect(normalizeDigits('01012345678999', 11)).toBe('01012345678');
  });
});

describe('formatKoreanMobilePhone', () => {
  it('formats progressive phone input without odd hyphens', () => {
    expect(formatKoreanMobilePhone('0')).toBe('0');
    expect(formatKoreanMobilePhone('010')).toBe('010');
    expect(formatKoreanMobilePhone('0101')).toBe('010-1');
    expect(formatKoreanMobilePhone('0101234')).toBe('010-1234');
    expect(formatKoreanMobilePhone('01012345678')).toBe('010-1234-5678');
  });

  it('handles paste with noise and truncates over 11', () => {
    expect(formatKoreanMobilePhone('abc010-1234-5678xyz999')).toBe('010-1234-5678');
  });

  it('formats 10-digit mobile as 3-3-4', () => {
    expect(formatKoreanMobilePhone('0111234567')).toBe('011-123-4567');
  });
});

describe('formatKoreanResidentNumber', () => {
  it('formats progressive resident number input', () => {
    expect(formatKoreanResidentNumber('8')).toBe('8');
    expect(formatKoreanResidentNumber('880725')).toBe('880725');
    expect(formatKoreanResidentNumber('8807252')).toBe('880725-2');
    expect(formatKoreanResidentNumber('8807252123456')).toBe('880725-2123456');
  });

  it('handles paste and truncates over 13', () => {
    expect(formatKoreanResidentNumber('880725-2123456extra')).toBe('880725-2123456');
  });
});

describe('strip + applyFormInputFormat', () => {
  it('returns digits for API persistence', () => {
    expect(stripPhoneFormatting('010-1234-5678')).toBe('01012345678');
    expect(stripResidentNumberFormatting('880725-2123456')).toBe('8807252123456');
  });

  it('applies named formats', () => {
    expect(applyFormInputFormat('phone', '01012345678')).toBe('010-1234-5678');
    expect(applyFormInputFormat('residentNumber', '8807252123456')).toBe(
      '880725-2123456',
    );
  });
});
