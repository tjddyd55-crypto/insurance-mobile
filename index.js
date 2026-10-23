// 앱 entry. Android 홈 화면 위젯 갱신(headless task)은 번들 로드 때 등록되어야 하므로 여기서 등록한다.
// UI·라우팅은 expo-router/entry 그대로다.
import 'expo-router/entry';

import { registerWidgetHeadlessTask } from './src/features/home-widgets/widgetHeadlessTask';

registerWidgetHeadlessTask();
