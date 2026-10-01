/* eslint-disable @typescript-eslint/no-require-imports */
// @ts-nocheck
const fs = require('fs');
const path = require('path');

describe('saved customer detail hydration wiring', () => {
  it('loads customer details by id and keeps header save on the saved customer rules', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../CoverageSimulationScreen.tsx'),
      'utf8',
    );
    expect(src).toMatch(/getCustomer\(token, savedCustomerNumericId\)/);
    expect(src).toMatch(/toCoverageCustomerPickerRow\(savedCustomerDetail\.data\)/);
    expect(src).toMatch(/savedCustomerChipFromPickerRow/);
    const saveBranch = src.slice(src.indexOf('const saveFromHeader'), src.indexOf('const headerSave'));
    expect(saveBranch).toMatch(/resolveHeaderSaveCustomer/);
    expect(saveBranch).not.toMatch(/getCustomer/);
  });
});
