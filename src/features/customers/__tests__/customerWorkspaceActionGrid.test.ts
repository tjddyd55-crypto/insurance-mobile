import { buildCustomerWorkspaceActions } from '../customerWorkspaceActions';
import {
  countEmphasizedWorkspaceActions,
  resolveWorkspaceActionButtonVariant,
} from '../CustomerWorkspaceActionGrid';
import { lightTheme, usesFilledGreenAction } from '../../../design-system';

describe('CustomerWorkspaceActionGrid presentation', () => {
  it('모바일 고객 상세 action grid에는 map/premiumPayments가 없다', () => {
    const actions = buildCustomerWorkspaceActions('홍길동');
    expect(actions.some((action) => action.id === 'map')).toBe(false);
    expect(actions.some((action) => action.id === 'premiumPayments')).toBe(false);
  });

  it('모든 업무 action button variant는 secondary다', () => {
    const actions = buildCustomerWorkspaceActions('홍길동');
    expect(actions).toHaveLength(8);
    expect(
      actions.map((action) => resolveWorkspaceActionButtonVariant(action.id)),
    ).toEqual(Array.from({ length: 8 }, () => 'secondary'));
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

  it('업무 grid는 filled green action을 쓰지 않는다', () => {
    const actions = buildCustomerWorkspaceActions('홍길동');
    const greenCount = actions.filter((action) =>
      usesFilledGreenAction(lightTheme, resolveWorkspaceActionButtonVariant(action.id)),
    ).length;
    expect(greenCount).toBe(0);
  });
});
