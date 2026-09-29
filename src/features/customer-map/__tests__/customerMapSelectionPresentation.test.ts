import {
  buildCustomerMapPanelPresentation,
  buildGroupSelectionTitle,
  mapApiGenderLabelToGender,
} from '../customerMapSelectionPresentation';
import type { CustomerMapItem } from '../types';

function mapCustomer(partial: Partial<CustomerMapItem> & Pick<CustomerMapItem, 'id' | 'name'>): CustomerMapItem {
  return {
    id: partial.id,
    name: partial.name,
    phone: partial.phone ?? '',
    address: partial.address ?? '',
    birthDateYmd: partial.birthDateYmd ?? null,
    gender: partial.gender ?? null,
    latitude: partial.latitude ?? 37.5,
    longitude: partial.longitude ?? 127,
    lastConsultDate: null,
    isFavorite: false,
    markerNo: partial.markerNo ?? partial.id,
  };
}

describe('customerMapSelectionPresentation', () => {
  it('maps API gender labels to detail gender SSOT', () => {
    expect(mapApiGenderLabelToGender('남')).toBe('male');
    expect(mapApiGenderLabelToGender('여')).toBe('female');
    expect(mapApiGenderLabelToGender('-')).toBeNull();
  });

  it('renders full-width panel fields with shared formatters', () => {
    const panel = buildCustomerMapPanelPresentation(
      mapCustomer({
        id: 1,
        name: '홍길동',
        gender: 'male',
        birthDateYmd: '1990-01-01',
        phone: '01012345678',
        address: '서울특별시 광진구',
      }),
    );

    expect(panel.displayName).toBe('홍길동');
    expect(panel.genderParenthetical).toBe('(남)');
    expect(panel.genderTone).toBe('male');
    expect(panel.birthDate).toBe('1990.01.01');
    expect(panel.phone).toBe('010-1234-5678');
    expect(panel.address).toBe('서울특별시 광진구');
  });

  it('uses em dash for missing birthDate, phone, and address', () => {
    const panel = buildCustomerMapPanelPresentation(
      mapCustomer({ id: 2, name: '무명', gender: null }),
    );

    expect(panel.genderParenthetical).toBeNull();
    expect(panel.birthDate).toBe('—');
    expect(panel.phone).toBe('—');
    expect(panel.address).toBe('—');
  });

  it('builds grouped marker title', () => {
    expect(
      buildGroupSelectionTitle(
        [mapCustomer({ id: 1, name: '김건' }), mapCustomer({ id: 2, name: '김환' })],
        2,
      ),
    ).toBe('김건 외 1명');
  });
});
