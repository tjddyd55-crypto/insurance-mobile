import { DrawerActions } from '@react-navigation/native';

type DrawerHostNavigation = {
  dispatch: (action: { type: string }) => void;
};

/**
 * 중첩 Stack 안에서도 부모 Drawer를 연다.
 * 화면의 navigation.openDrawer()는 Stack에는 없다.
 */
export function openAppDrawer(navigation: DrawerHostNavigation): void {
  navigation.dispatch(DrawerActions.openDrawer());
}
