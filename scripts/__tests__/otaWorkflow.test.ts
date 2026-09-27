// App tsconfig types are Jest only. This file shells the OTA script with Node APIs.
// @ts-nocheck
import { execFileSync } from 'child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

function run(args: string[], env: NodeJS.ProcessEnv = {}) {
  return execFileSync('node', ['scripts/otaWorkflow.mjs', ...args], {
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
}

describe('manual OTA workflow script', () => {
  it('prints runtime 1.0.3 for the production appVersion policy and rejects anything else', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ota-runtime-'));
    const file = join(dir, 'config.json');
    writeFileSync(file, JSON.stringify({ version: '1.0.3', runtimeVersion: { policy: 'appVersion' } }));
    const ok = run(['assert-runtime', file]);
    expect(ok).toContain('version=1.0.3');
    expect(ok).toContain('runtimeVersion=1.0.3');

    writeFileSync(file, JSON.stringify({ version: '1.0.3', runtimeVersion: '1.0.3' }));
    expect(run(['assert-runtime', file])).toContain('runtimeVersion=1.0.3');

    writeFileSync(file, JSON.stringify({ version: '1.0.0', runtimeVersion: { policy: 'appVersion' } }));
    expect(() => run(['assert-runtime', file])).toThrow();
    writeFileSync(file, JSON.stringify({ version: '1.0.3', runtimeVersion: 'production' }));
    expect(() => run(['assert-runtime', file])).toThrow();
  });

  it('writes the eas update group ID into the job summary', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ota-group-'));
    const output = join(dir, 'eas.txt');
    const summary = join(dir, 'summary.md');
    writeFileSync(output, [
      '✔ Published!',
      'Branch             native-production',
      'Runtime version    1.0.3',
      'Update group ID    123e4567-e89b-12d3-a456-426614174000',
    ].join('\n'));
    const printed = run(['group-id', output], {
      GITHUB_STEP_SUMMARY: summary,
      OTA_PLATFORM: 'all',
      OTA_MESSAGE: 'manual hotfix',
    });
    expect(printed.trim()).toBe('123e4567-e89b-12d3-a456-426614174000');
    const markdown = readFileSync(summary, 'utf8');
    expect(markdown).toContain('123e4567-e89b-12d3-a456-426614174000');
    expect(markdown).toContain('native-production');
    expect(markdown).toContain('manual hotfix');

    writeFileSync(output, 'published without an id');
    expect(() => run(['group-id', output])).toThrow();
  });
});
