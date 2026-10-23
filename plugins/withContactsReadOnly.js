const { withAndroidManifest } = require('expo/config-plugins');

const WRITE_CONTACTS = 'android.permission.WRITE_CONTACTS';
const TOOLS_NAMESPACE = 'http://schemas.android.com/tools';

/**
 * expo-contacts 플러그인이 WRITE_CONTACTS 를 넣으면 머지에서 제거한다.
 * READ_CONTACTS 는 유지한다. 앱 코드는 주소록을 수정하지 않는다.
 */
function removeWriteContacts(manifest) {
  const root = manifest.manifest;
  root.$ = root.$ ?? {};
  if (!root.$['xmlns:tools']) {
    root.$['xmlns:tools'] = TOOLS_NAMESPACE;
  }
  const permissions = Array.isArray(root['uses-permission']) ? root['uses-permission'] : [];
  const kept = permissions.filter((item) => item?.$?.['android:name'] !== WRITE_CONTACTS);
  kept.push({
    $: {
      'android:name': WRITE_CONTACTS,
      'tools:node': 'remove',
    },
  });
  root['uses-permission'] = kept;
  return manifest;
}

function withContactsReadOnly(config) {
  return withAndroidManifest(config, (next) => {
    next.modResults = removeWriteContacts(next.modResults);
    return next;
  });
}

module.exports = withContactsReadOnly;
module.exports.removeWriteContacts = removeWriteContacts;
