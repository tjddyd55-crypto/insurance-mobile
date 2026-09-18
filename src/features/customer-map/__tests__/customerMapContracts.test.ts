// @ts-nocheck
const fs = require('fs');
const path = require('path');

function readSource(fileName: string): string {
  return fs.readFileSync(path.join(__dirname, '..', fileName), 'utf8');
}

describe('customerMapContracts', () => {
  it('does not navigate directly from marker bridge handler', () => {
    const screenSource = readSource('CustomerMapScreen.tsx');
    expect(screenSource).toMatch(/resolveCustomerMapBridgeAction/);
    const bridgeHandler =
      screenSource.match(/const handleBridgeMessage = useCallback\([\s\S]*?\),/)?.[0] ?? '';
    expect(bridgeHandler).not.toContain('router.push');
    expect(screenSource).toMatch(/onOpenDetail=\{\(customerId\) => router\.push/);
  });

  it('uses overlay detail action for second-step navigation', () => {
    const overlaySource = readSource('CustomerMapSelectionOverlay.tsx');
    const screenSource = readSource('CustomerMapScreen.tsx');
    expect(overlaySource).toMatch(/accessibilityLabel="고객 상세 보기"/);
    expect(overlaySource).toMatch(/onPress=\{\(\) => onSelectCustomer\(customer\.id\)\}/);
    expect(overlaySource).toMatch(/onPress=\{\(\) => onOpenDetail\(customer\.id\)\}/);
    expect(screenSource).toMatch(/left: 0,\s*\n\s*right: 0,\s*\n\s*bottom: 0/);
    expect(overlaySource).not.toMatch(/theme\.shadows\.floating/);
    expect(overlaySource).toMatch(/buildCustomerMapPanelPresentation/);
    expect(overlaySource).toMatch(/생년월일/);
    expect(overlaySource).toMatch(/연락처/);
    expect(overlaySource).toMatch(/주소/);
    const presentationSource = readSource('customerMapSelectionPresentation.ts');
    expect(presentationSource).toMatch(/formatCustomerGenderParenthetical/);
  });

  it('posts marker_select and map_click bridge messages from web html', () => {
    const htmlSource = readSource('naverMapHtml.ts');
    expect(htmlSource).toMatch(/marker_select/);
    expect(htmlSource).toMatch(/map_click/);
    expect(htmlSource).not.toMatch(/marker_press/);
  });
});
