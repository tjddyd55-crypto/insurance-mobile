import { getGaDataEmptyState } from '../customerGaDataPresentation';

describe('customerGaDataPresentation', () => {
  it('GA Excel 기능이 꺼져 있으면 안내 메시지를 표시한다', () => {
    expect(getGaDataEmptyState(false)).toEqual({
      title: '등록된 GA 데이터가 없습니다.',
      message: 'GA Excel 기능이 활성화되지 않았습니다.',
    });
  });

  it('GA Excel 기능이 켜져 있으면 고객 연결 안내를 표시한다', () => {
    expect(getGaDataEmptyState(true)).toEqual({
      title: '등록된 GA 데이터가 없습니다.',
      message: '이 고객에 연결된 GA Excel 데이터가 없습니다.',
    });
  });
});
