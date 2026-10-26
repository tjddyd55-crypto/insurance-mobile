// @ts-nocheck
import { readFileSync } from 'fs';
import { join } from 'path';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { addLatestLaunchIntent } = require('../withLatestLaunchIntent') as { addLatestLaunchIntent: (src: string) => string };

const TEMPLATE = `package com.onefc.app

import android.os.Build
import android.os.Bundle

import com.facebook.react.ReactActivity

class MainActivity : ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(null)
  }
}
`;

describe('withLatestLaunchIntent', () => {
  it('makes the newest launch intent the activity intent before React handles it', () => {
    const out = addLatestLaunchIntent(TEMPLATE);
    expect(out).toContain('import android.content.Intent\n');
    expect(out).toMatch(/override fun onNewIntent\(intent: Intent\) \{\n\s+setIntent\(intent\)\n\s+super\.onNewIntent\(intent\)/);
  });

  it('is idempotent', () => {
    const once = addLatestLaunchIntent(TEMPLATE);
    expect(addLatestLaunchIntent(once)).toBe(once);
  });

  it('is registered in app config', () => {
    const config = readFileSync(join(__dirname, '../../app.config.ts'), 'utf8');
    expect(config).toContain("'./plugins/withLatestLaunchIntent.js'");
  });
});
