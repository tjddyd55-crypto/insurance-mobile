type DrawerHostNavigation = {
  dispatch: (action: { type: string }) => void;
};

/**
 * 부모 Drawer의 openDrawer.
 * 라우트가 react-navigation 패키지를 직접 import 하면 SDK 56+ export가 실패한다.
 */
const OPEN_APP_DRAWER = { type: 'OPEN_DRAWER' } as const;

/**
 * 중첩 Stack 안에서도 부모 Drawer를 연다.
 * 화면의 navigation.openDrawer()는 Stack에는 없다.
 */
export function openAppDrawer(navigation: DrawerHostNavigation): void {
  navigation.dispatch(OPEN_APP_DRAWER);
}
