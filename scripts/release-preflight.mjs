#!/usr/bin/env node
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const args = new Set(process.argv.slice(2));
const releaseMode = args.has('--release');
const fullMode = args.has('--full');

const checks = [];

function addCheck(id, status, message) {
  checks.push({ id, status, message });
}

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function fileExists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function runGit(command) {
  return execSync(command, { cwd: root, encoding: 'utf8' }).trim();
}

function parseAppConfigNumbers(source) {
  const appVersion = source.match(/const appVersion = isProduction \? '([^']+)'/)?.[1] ?? 'unknown';
  const androidVersionCode = Number(
    source.match(/const androidVersionCode = isProduction \? (\d+)/)?.[1] ?? NaN,
  );
  const iosBuildNumber = Number(
    source.match(/const iosBuildNumber = isProduction \? '(\d+)'/)?.[1] ?? NaN,
  );
  return { appVersion, androidVersionCode, iosBuildNumber };
}

function resolveGoogleServicesPresence(environment) {
  if (environment === 'production') {
    if (process.env.GOOGLE_SERVICES_JSON?.trim()) {
      return { android: 'PRESENT', ios: process.env.GOOGLE_SERVICES_INFO_PLIST?.trim() ? 'PRESENT' : 'MISSING' };
    }
    return { android: 'MISSING', ios: process.env.GOOGLE_SERVICES_INFO_PLIST?.trim() ? 'PRESENT' : 'MISSING' };
  }
  const androidCandidates = ['google-services.dev.json', 'google-services.json'];
  const iosCandidates = ['GoogleService-Info.dev.plist', 'GoogleService-Info.plist'];
  const android = androidCandidates.some((candidate) => fileExists(candidate)) ? 'PRESENT' : 'MISSING';
  const ios = iosCandidates.some((candidate) => fileExists(candidate)) ? 'PRESENT' : 'MISSING';
  return { android, ios };
}

function scanSensitiveUntracked() {
  const status = runGit('git status --porcelain');
  const untracked = status
    .split('\n')
    .filter((line) => line.startsWith('??'))
    .map((line) => line.slice(3).trim());
  const patterns = [
    /^\.env\.production$/i,
    /\.p8$/i,
    /\.keystore$/i,
    /\.jks$/i,
    /credentials\.json$/i,
    /^GoogleService-Info(?!\.example).*\.plist$/i,
    /^google-services(?!\.example).*\.json$/i,
  ];
  return untracked.filter((entry) => patterns.some((pattern) => pattern.test(entry)));
}

function checkVersion(appConfigSource) {
  const { appVersion, androidVersionCode, iosBuildNumber } = parseAppConfigNumbers(appConfigSource);
  const expected = 6;
  addCheck('version.name', appVersion === '1.0.3' ? 'PASS' : 'BLOCKED', `versionName=${appVersion}`);
  if (releaseMode) {
    addCheck(
      'version.androidCode',
      androidVersionCode === expected ? 'PASS' : 'BLOCKED',
      `Android versionCode=${androidVersionCode}, expected release code=${expected}`,
    );
    addCheck(
      'version.iosBuild',
      iosBuildNumber === expected ? 'PASS' : 'BLOCKED',
      `iOS buildNumber=${iosBuildNumber}, expected release build=${expected}`,
    );
  } else {
    addCheck(
      'version.androidCode',
      androidVersionCode === 5 ? 'PASS' : 'WARN',
      `Android versionCode=${androidVersionCode} (release step will require ${expected})`,
    );
    addCheck(
      'version.iosBuild',
      iosBuildNumber === 5 ? 'PASS' : 'WARN',
      `iOS buildNumber=${iosBuildNumber} (release step will require ${expected})`,
    );
  }
}

function checkIdentity() {
  const identity = JSON.parse(readText('app.identity.json'));
  const environmentSource = readText('src/config/environment.ts');
  const prod = identity.production;
  const dev = identity.development;
  const prodOk =
    prod.applicationId === 'com.onefc.app' &&
    prod.displayName === 'ONE FC' &&
    prod.scheme === 'onefc' &&
    environmentSource.includes('insurance-production');
  const devOk =
    dev.applicationId === 'com.onefc.app.dev' &&
    dev.displayName === 'ONE FC DEV' &&
    dev.scheme === 'onefc-dev' &&
    environmentSource.includes('insurance-dev');
  addCheck('identity.production', prodOk ? 'PASS' : 'BLOCKED', 'Production app identity contract');
  addCheck('identity.development', devOk ? 'PASS' : 'BLOCKED', 'Development app identity contract');
}

function checkEnvironmentFiles() {
  const appConfig = readText('app.config.ts');
  addCheck(
    'config.naverMap',
    process.env.EXPO_PUBLIC_NAVER_MAP_CLIENT_ID?.trim() ? 'PASS' : 'WARN',
    `EXPO_PUBLIC_NAVER_MAP_CLIENT_ID=${process.env.EXPO_PUBLIC_NAVER_MAP_CLIENT_ID?.trim() ? 'PRESENT' : 'MISSING'}`,
  );
  addCheck(
    'config.iosPlistResolver',
    appConfig.includes('resolveGoogleServiceInfoPlist') ? 'PASS' : 'BLOCKED',
    'iOS googleServicesFile resolver present in app.config.ts',
  );
  const google = resolveGoogleServicesPresence(releaseMode ? 'production' : 'development');
  addCheck(
    'config.androidGoogleServices',
    releaseMode && google.android !== 'PRESENT' ? 'BLOCKED' : google.android === 'PRESENT' ? 'PASS' : 'WARN',
    `Android googleServicesFile=${google.android}`,
  );
  addCheck(
    'config.iosGoogleServices',
    google.ios === 'PRESENT' ? 'PASS' : 'BLOCKED',
    `iOS GoogleService-Info.plist=${google.ios}`,
  );
}

function checkGit() {
  const branch = runGit('git branch --show-current');
  const status = runGit('git status --porcelain');
  const dirty = status
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith('?? qa-assets/') && !line.startsWith('?? qa-screenshots/'));
  addCheck('git.branch', branch === 'release/native-v1.0.3' ? 'PASS' : 'WARN', `branch=${branch}`);
  addCheck('git.clean', dirty.length === 0 ? 'PASS' : 'BLOCKED', dirty.length ? `dirty entries=${dirty.length}` : 'working tree clean');
  addCheck('git.head', 'PASS', `HEAD=${runGit('git rev-parse --short HEAD')}`);
  const sensitive = scanSensitiveUntracked();
  addCheck(
    'git.sensitiveUntracked',
    sensitive.length === 0 ? 'PASS' : 'BLOCKED',
    sensitive.length ? `sensitive untracked=${sensitive.join(', ')}` : 'no sensitive untracked files',
  );
  try {
    const upstream = runGit('git rev-parse @{u}');
    const aheadBehind = runGit(`git rev-list --left-right --count ${upstream}...HEAD`);
    addCheck('git.originSync', 'PASS', `upstream sync counts=${aheadBehind}`);
  } catch {
    addCheck('git.originSync', 'WARN', 'no upstream tracking branch');
  }
}

function checkBackendCompatibilityNote() {
  addCheck(
    'backend.commentsApi',
    'WARN',
    'develop includes /agent/customer-news/:id/comments + customer_news_comments; merge/deploy backend before store release',
  );
}

function checkOtaConfig(appConfigSource, packageJsonSource) {
  const packageJson = JSON.parse(packageJsonSource);
  const hasExpoUpdates =
    Boolean(packageJson.dependencies?.['expo-updates']) ||
    Boolean(packageJson.devDependencies?.['expo-updates']);
  addCheck(
    'ota.expoUpdatesDependency',
    hasExpoUpdates ? 'PASS' : 'BLOCKED',
    hasExpoUpdates ? 'expo-updates dependency present' : 'expo-updates dependency missing',
  );

  const updatesEnabled = /updates:\s*\{[^}]*enabled:\s*true/.test(appConfigSource);
  addCheck(
    'ota.updatesEnabled',
    updatesEnabled ? 'PASS' : 'BLOCKED',
    `updates.enabled=${updatesEnabled ? 'true' : 'false'}`,
  );

  const projectId = '5e46e0bc-2885-4455-88ce-9ca1623df305';
  const hasUpdatesUrl =
    appConfigSource.includes(`https://u.expo.dev/${projectId}`) ||
    /url:\s*`https:\/\/u\.expo\.dev\/\$\{projectId\}`/.test(appConfigSource);
  addCheck(
    'ota.updatesUrl',
    hasUpdatesUrl ? 'PASS' : 'BLOCKED',
    hasUpdatesUrl ? `updates.url uses projectId=${projectId}` : 'updates.url missing or wrong projectId',
  );

  const hasAppVersionPolicy = /runtimeVersion:\s*\{[^}]*policy:\s*'appVersion'/.test(
    appConfigSource,
  );
  addCheck(
    'ota.runtimePolicy',
    hasAppVersionPolicy ? 'PASS' : 'BLOCKED',
    hasAppVersionPolicy ? 'runtimeVersion.policy=appVersion' : 'runtimeVersion policy missing',
  );

  const easJson = JSON.parse(readText('eas.json'));
  const hasProductionStaging = Boolean(easJson.build?.['production-staging']);
  addCheck(
    'ota.productionStagingProfile',
    hasProductionStaging ? 'PASS' : 'WARN',
    hasProductionStaging
      ? 'production-staging profile present'
      : 'production-staging profile missing (recommended for PROD OTA validation)',
  );
}

function runFullValidation() {
  try {
    execSync('npm run typecheck', { cwd: root, stdio: 'inherit' });
    addCheck('tests.typecheck', 'PASS', 'npm run typecheck');
  } catch {
    addCheck('tests.typecheck', 'BLOCKED', 'npm run typecheck failed');
  }
  try {
    execSync('npm test -- --runInBand', { cwd: root, stdio: 'inherit' });
    addCheck('tests.native', 'PASS', 'npm test');
  } catch {
    addCheck('tests.native', 'BLOCKED', 'npm test failed');
  }
}

function main() {
  console.log('ONE FC Native — Release Preflight');
  console.log(`mode=${releaseMode ? 'release' : 'audit'} full=${fullMode}`);
  const appConfigSource = readText('app.config.ts');
  const packageJsonSource = readText('package.json');
  checkVersion(appConfigSource);
  checkIdentity();
  checkEnvironmentFiles();
  checkOtaConfig(appConfigSource, packageJsonSource);
  checkGit();
  checkBackendCompatibilityNote();
  if (fullMode) {
    runFullValidation();
  }

  for (const check of checks) {
    console.log(`[${check.status}] ${check.id}: ${check.message}`);
  }

  const blocked = checks.filter((check) => check.status === 'BLOCKED');
  if (blocked.length) {
    console.log('\nRELEASE_PREFLIGHT_BLOCKED');
    blocked.forEach((check) => console.log(`- ${check.id}: ${check.message}`));
    process.exitCode = 1;
    return;
  }
  console.log('\nRELEASE_PREFLIGHT_PASS');
}

main();
