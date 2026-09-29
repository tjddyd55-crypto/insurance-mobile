import { SMS_PC_ONLY_MESSAGE, SMS_PC_ONLY_TITLE } from '../smsPcOnlyPresentation';

describe('SMS PC-only presentation', () => {
  it('keeps PC guidance copy without send management UI hooks', () => {
    expect(SMS_PC_ONLY_TITLE).toContain('PC에서 이용해 주세요');
    expect(SMS_PC_ONLY_MESSAGE).toContain('PC에서 ONE FC에 접속');
  });
});
