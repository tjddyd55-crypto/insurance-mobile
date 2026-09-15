import { buildCustomerWorkspaceActions } from '../customerWorkspaceActions';
import {
  countEmphasizedWorkspaceActions,
  resolveWorkspaceActionButtonVariant,
  workspaceActionButtonSurface,
} from '../CustomerWorkspaceActionGrid';
import { lightTheme } from '../../../design-system';

describe('CustomerWorkspaceActionGrid presentation', () => {
  it('모바일 고객 상세 action grid에는 map/premiumPayments가 없다', () => {
    const actions = buildCustomerWorkspaceActions('홍길동');
    expect(actions.some((action) => action.id === 'map')).toBe(false);
    expect(actions.some((action) => action.id === 'premiumPayments')).toBe(false);
  });

  it('모든 업무 action button은 filledGreen 스타일이다', () => {
    const actions = buildCustomerWorkspaceActions('홍길동');
    expect(actions).toHaveLength(8);
    expect(
      actions.map((action) => resolveWorkspaceActionButtonVariant(action.id)),
    ).toEqual(Array.from({ length: 8 }, () => 'filledGreen'));
  });

  it('legacy emphasis flag가 없다', () => {
    const actions = buildCustomerWorkspaceActions('홍길동');
    expect(countEmphasizedWorkspaceActions(actions)).toBe(0);
    for (const action of actions) {
      expect(action).not.toHaveProperty('variant');
      expect(action).not.toHaveProperty('primary');
      expect(action).not.toHaveProperty('highlighted');
      expect(action).not.toHaveProperty('tone');
    }
  });

  it('업무 grid는 메인 초록 채움 surface를 사용한다', () => {
    const surface = workspaceActionButtonSurface(lightTheme);
    expect(surface.backgroundColor).toBe(lightTheme.colors.primary);
    expect(surface.borderColor).toBe(lightTheme.colors.primary);
    expect(surface.color).toBe(lightTheme.colors.onPrimary);
  });
});
