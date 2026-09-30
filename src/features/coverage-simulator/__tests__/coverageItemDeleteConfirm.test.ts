// @ts-nocheck
const fs = require('fs');
const path = require('path');

describe('coverage item delete confirm', () => {
  it('shows the delete confirm over the item edit form', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../CoverageSimulationScreen.tsx'),
      'utf8',
    );
    const editBranch = src.slice(
      src.indexOf("form?.type === 'edit'"),
      src.indexOf('const items = sortItems'),
    );
    expect(editBranch).toMatch(/CoverageItemForm/);
    expect(editBranch).toMatch(/\{deleteConfirm\}/);
    expect(src).toMatch(/function CoverageItemDeleteDialog/);
  });

  it('opens the inline keyboard after the input is attached', () => {
    const src = fs.readFileSync(path.join(__dirname, '../CoverageTimeline.tsx'), 'utf8');
    expect(src).toMatch(/useFocusTextInputWhenAttached/);
    expect(src).toMatch(/onLayout=\{focusWhenAttached\}/);
    expect(src).not.toMatch(/inputRef\.current\?\.focus\(\)/);
  });
});
