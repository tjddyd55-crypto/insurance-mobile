export function getGaDataEmptyState(useGaExcel: boolean | undefined): {
  title: string;
  message: string;
} {
  if (!useGaExcel) {
    return {
      title: '등록된 GA 데이터가 없습니다.',
      message: 'GA Excel 기능이 활성화되지 않았습니다.',
    };
  }
  return {
    title: '등록된 GA 데이터가 없습니다.',
    message: '이 고객에 연결된 GA Excel 데이터가 없습니다.',
  };
}
