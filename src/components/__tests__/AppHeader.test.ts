import { APP_HEADER_TITLE_TEXT_PROPS, createAppHeaderStyles } from '../AppHeader';
import { getTheme } from '../../design-system/themes';

describe('AppHeader layout', () => {
  const styles = createAppHeaderStyles(getTheme('light'));

  it('title area uses remaining width and can shrink', () => {
    expect(styles.titleBlock.flex).toBe(1);
    expect(styles.titleBlock.minWidth).toBe(0);
    expect(styles.titleBlock.flexShrink).toBe(1);
  });

  it('leading and action areas do not shrink', () => {
    expect(styles.leading.flexShrink).toBe(0);
    expect(styles.right.flexShrink).toBe(0);
  });

  it('customer title uses single-line tail ellipsis', () => {
    expect(APP_HEADER_TITLE_TEXT_PROPS.numberOfLines).toBe(1);
    expect(APP_HEADER_TITLE_TEXT_PROPS.ellipsizeMode).toBe('tail');
  });
});
