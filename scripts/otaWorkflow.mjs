/**
 * Manual production OTA helpers.
 * Runtime must stay 1.0.3 so the update matches the store binary.
 */
import { pathToFileURL } from 'node:url';

const RUNTIME = '1.0.3';
const GROUP_ID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export function resolveProductionRuntime(config) {
  const version = String(config?.version ?? '').trim();
  const runtime = config?.runtimeVersion;
  const policy = runtime && typeof runtime === 'object' ? String(runtime.policy ?? '') : '';
  const resolved = typeof runtime === 'string'
    ? runtime.trim()
    : policy === 'appVersion'
      ? version
      : '';
  return { version, policy, resolved };
}

export function assertProductionRuntime(config) {
  const result = resolveProductionRuntime(config);
  const lines = [
    `version=${result.version || '(empty)'}`,
    `runtimeVersion=${result.resolved || '(unresolved)'}`,
    result.policy ? `runtimeVersion.policy=${result.policy}` : 'runtimeVersion.policy=(none)',
  ];
  if (result.version !== RUNTIME || result.resolved !== RUNTIME) {
    const error = new Error(
      `OTA runtime must be ${RUNTIME}. ${lines.join(' ')}`,
    );
    error.lines = lines;
    throw error;
  }
  return { ...result, lines };
}

export function extractUpdateGroupId(output) {
  const text = String(output ?? '');
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (!/update group id/i.test(line)) continue;
    const match = line.match(GROUP_ID_PATTERN);
    if (match) return match[0];
  }
  return null;
}

export function buildUpdateSummary({ platform, message, groupId, runtime }) {
  return [
    '### Native production OTA',
    `- channel: \`native-production\``,
    `- environment: \`production\``,
    `- platform: \`${platform}\``,
    `- runtime: \`${runtime}\``,
    `- message: ${message}`,
    `- update group ID: \`${groupId}\``,
  ].join('\n');
}

function readStdin() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    process.stdin.on('data', (chunk) => chunks.push(chunk));
    process.stdin.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    process.stdin.on('error', reject);
  });
}

async function main(argv) {
  const command = argv[2];
  if (command === 'assert-runtime') {
    const raw = argv[3] ? await import('node:fs').then((fs) => fs.readFileSync(argv[3], 'utf8')) : await readStdin();
    try {
      const result = assertProductionRuntime(JSON.parse(raw));
      console.log(result.lines.join('\n'));
      if (process.env.GITHUB_STEP_SUMMARY) {
        const fs = await import('node:fs');
        fs.appendFileSync(
          process.env.GITHUB_STEP_SUMMARY,
          `Verified runtime \`${result.resolved}\` (version \`${result.version}\`).\n`,
        );
      }
    } catch (error) {
      const lines = error instanceof Error && Array.isArray(error.lines) ? error.lines : [];
      console.error(lines.join('\n'));
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
    return;
  }
  if (command === 'group-id') {
    const fs = await import('node:fs');
    const raw = argv[3] ? fs.readFileSync(argv[3], 'utf8') : await readStdin();
    const groupId = extractUpdateGroupId(raw);
    if (!groupId) {
      console.error('EAS output에서 update group ID를 찾지 못했습니다.');
      process.exit(1);
    }
    console.log(groupId);
    const summaryPath = process.env.GITHUB_STEP_SUMMARY;
    if (summaryPath) {
      const summary = buildUpdateSummary({
        platform: process.env.OTA_PLATFORM || '',
        message: process.env.OTA_MESSAGE || '',
        groupId,
        runtime: RUNTIME,
      });
      fs.appendFileSync(summaryPath, `${summary}\n`);
    }
    return;
  }
  console.error('usage: node scripts/otaWorkflow.mjs <assert-runtime|group-id> [file]');
  process.exit(1);
}

const entry = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === entry) {
  main(process.argv).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
