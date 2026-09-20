// @ts-nocheck
const fs = require('fs');
const path = require('path');

function readSource(fileName: string): string {
  return fs.readFileSync(path.join(__dirname, '..', fileName), 'utf8');
}

describe('CustomerRegistrationSendModal', () => {
  it('uses shared modal shell and registration APIs', () => {
    const source = readSource('CustomerRegistrationSendModal.tsx');
    expect(source).toMatch(/ModalShell/);
    expect(source).toMatch(/ModalCloseButton/);
    expect(source).toMatch(/closeOnBackdrop=\{false\}/);
    expect(source).toMatch(/getCustomerRegistrationLink/);
    expect(source).toMatch(/sendCustomerRegistrationAlimtalk/);
    expect(source).toMatch(/고객등록 발송/);
    expect(source).toMatch(/링크 복사/);
    expect(source).toMatch(/카카오톡 발송/);
  });
});

describe('CustomersScreen registration send entry', () => {
  it('opens modal instead of immediate clipboard copy', () => {
    const source = readSource('CustomersScreen.tsx');
    expect(source).toMatch(/CustomerRegistrationSendModal/);
    expect(source).toMatch(/setRegistrationSendOpen\(true\)/);
    expect(source).toMatch(/customers-registration-send-button/);
    expect(source).not.toMatch(/getCustomerRegistrationLink/);
    expect(source).not.toMatch(/inviteMutation/);
    expect(source).not.toMatch(/Clipboard/);
  });
});

describe('CustomerDetailScreen registration send entry', () => {
  it('opens modal with customer phone prefill', () => {
    const source = readSource('CustomerDetailScreen.tsx');
    expect(source).toMatch(/CustomerRegistrationSendModal/);
    expect(source).toMatch(/prefilledPhone=\{customer\?\.phone/);
    expect(source).toMatch(/onRegistrationSend=\{\(\) => setRegistrationSendOpen\(true\)\}/);
    expect(source).not.toMatch(/getCustomerRegistrationLink/);
    expect(source).not.toMatch(/inviteMutation/);
  });

  it('renders detail task panel registration send button', () => {
    const source = readSource('CustomerDetailTaskPanel.tsx');
    expect(source).toMatch(/customer-detail-registration-send-button/);
    expect(source).toMatch(/고객 등록 발송/);
  });
});

describe('LoginForm native download cleanup', () => {
  it('removes PC/Android/iPhone download buttons', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', '..', 'auth', 'LoginForm.tsx'),
      'utf8',
    );
    expect(source).not.toMatch(/PC버전/);
    expect(source).not.toMatch(/안드로이드/);
    expect(source).not.toMatch(/아이폰/);
    expect(source).not.toMatch(/Linking/);
  });
});
