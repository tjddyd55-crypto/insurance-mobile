// @ts-nocheck
const fs = require('fs');
const path = require('path');

function readSource(relPath: string): string {
  return fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8');
}

describe('customer alimtalk native contract (API client only, no payload builders)', () => {
  it('registration API calls backend endpoint with receiver only', () => {
    const native = readSource('customersApi.ts');
    expect(native).toMatch(/\/api\/agent\/customer-registration\/alimtalk/);
    expect(native).toMatch(/JSON\.stringify\(\{ receiver \}\)/);
    expect(native).not.toMatch(/buildCustomerRegistration/);
    expect(native).not.toMatch(/buildMessage/);
    expect(native).not.toMatch(/UJ_6670/);
    expect(native).not.toMatch(/buttonPayload/);
  });

  it('customer app API calls backend endpoint without native template code', () => {
    const native = readSource('../claims/claimsApi.ts');
    expect(native).toMatch(/\/api\/agent\/customers\/\$\{customerId\}\/customer-app\/alimtalk/);
    expect(native).not.toMatch(/buildCustomerAppLink/);
    expect(native).not.toMatch(/buildMessage/);
    expect(native).not.toMatch(/UJ_6184/);
    expect(native).not.toMatch(/buttonPayload/);
  });

  it('feedback messages match Web CustomerLinkShareModal SSOT strings', () => {
    const regModel = readSource('customerRegistrationShareModel.ts');
    const appModel = readSource('customerAppShareModel.ts');
    expect(regModel).toMatch(/고객등록 카카오톡 발송 테스트가 완료되었습니다/);
    expect(regModel).toMatch(/고객등록 카카오톡 발송 요청이 접수되었습니다/);
    expect(regModel).toMatch(/템플릿 승인 전이라 실제 카카오톡 발송은 차단되었습니다/);
    expect(appModel).toMatch(/고객앱 링크 카카오톡 발송 테스트가 완료되었습니다/);
    expect(appModel).toMatch(/고객앱 링크 카카오톡 발송 요청이 접수되었습니다/);
    expect(appModel).toMatch(/템플릿 승인 전이라 실제 카카오톡 발송은 차단되었습니다/);
  });

  it('registration modal uses keyboard-safe ModalShell footer pattern', () => {
    const modal = readSource('CustomerRegistrationSendModal.tsx');
    expect(modal).toMatch(/keyboardAvoiding/);
    expect(modal).toMatch(/footer=\{/);
    expect(modal).toMatch(/Keyboard\.dismiss/);
  });
});
