const { withMainActivity } = require('expo/config-plugins');

const MARKER = '// onefc:latest-launch-intent';

/**
 * MainActivity 는 singleTask 다. 프로세스가 죽은 뒤 위젯을 누르면 Android 는 남아 있던 task 의
 * "이전" intent 로 MainActivity 를 다시 만들고, 새 위젯 링크는 onNewIntent 로만 준다.
 * JS(Linking.getInitialURL)는 getIntent() 를 읽으므로 이전 링크로 이동하고 새 링크를 잃는다.
 * onNewIntent 에서 setIntent(intent) 를 먼저 해 두면 콜드/웜 모두 "방금 받은 링크"가 이긴다.
 */
function addLatestLaunchIntent(src) {
  if (src.includes(MARKER)) return src;
  let next = src;
  if (!/^import android\.content\.Intent$/m.test(next)) {
    next = next.replace(/^(package [^\n]+\n)/, '$1\nimport android.content.Intent\n');
  }
  const method = `
  ${MARKER}
  override fun onNewIntent(intent: Intent) {
    setIntent(intent)
    super.onNewIntent(intent)
  }
`;
  const classOpen = /class MainActivity : ReactActivity\(\) \{\n/;
  if (!classOpen.test(next)) throw new Error('withLatestLaunchIntent: MainActivity class not found');
  if (/override fun onNewIntent\(/.test(next)) throw new Error('withLatestLaunchIntent: onNewIntent already defined');
  return next.replace(classOpen, (m) => m + method);
}

function withLatestLaunchIntent(config) {
  return withMainActivity(config, (next) => {
    if (next.modResults.language !== 'kt') throw new Error('withLatestLaunchIntent: Kotlin MainActivity expected');
    next.modResults.contents = addLatestLaunchIntent(next.modResults.contents);
    return next;
  });
}

module.exports = withLatestLaunchIntent;
module.exports.addLatestLaunchIntent = addLatestLaunchIntent;
