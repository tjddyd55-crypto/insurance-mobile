// @ts-nocheck
/* eslint-disable @typescript-eslint/no-require-imports */
import { openAppDrawer } from '../openAppDrawer';

const fs = require('fs');
const path = require('path');

describe('openAppDrawer', () => {
  it('dispatches open drawer so a nested stack can still open the menu', () => {
    const dispatch = jest.fn();
    openAppDrawer({ dispatch });
    expect(dispatch).toHaveBeenCalledWith({ type: 'OPEN_DRAWER' });
  });

  it('header menu uses the drawer action instead of the child navigator', () => {
    const header = fs.readFileSync(path.join(__dirname, '../../components/AppHeader.tsx'), 'utf8');
    expect(header).toContain('openAppDrawer(navigation)');
    expect(header).not.toContain('navigation.openDrawer()');
  });
});
