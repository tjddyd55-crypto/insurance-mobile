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
    expect(overlaySource).toMatch(/onOpenDetail\(selected\.id\)/);
    expect(overlaySource).toMatch(/onPress=\{\(\) => onSelectCustomer\(customer\.id\)\}/);
    expect(overlaySource).toMatch(/onPress=\{\(\) => onOpenDetail\(customer\.id\)\}/);
  });

  it('posts marker_select and map_click bridge messages from web html', () => {
    const htmlSource = readSource('naverMapHtml.ts');
    expect(htmlSource).toMatch(/marker_select/);
    expect(htmlSource).toMatch(/map_click/);
    expect(htmlSource).not.toMatch(/marker_press/);
  });
});
