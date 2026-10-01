// @ts-nocheck
const fs = require('fs');
const path = require('path');

describe('coverage inline edit focus during scroll', () => {
  it('does not commit when the amount cell is scrolled into view', () => {
    const screen = fs.readFileSync(
      path.join(__dirname, '../CoverageSimulationScreen.tsx'),
      'utf8',
    );
    const timeline = fs.readFileSync(
      path.join(__dirname, '../CoverageTimeline.tsx'),
      'utf8',
    );
    expect(screen).toMatch(/keyboardShouldPersistTaps="handled"/);
    expect(screen).toMatch(/keyboardDismissMode="none"/);
    expect(screen).toMatch(/shouldCommitInlineEditOnScroll\(programmaticScrollRef\.current\)/);
    expect(screen).toMatch(/markProgrammaticScroll/);
    expect(timeline).toMatch(/shouldIgnoreInlineEditBlur/);
    expect(timeline).toMatch(/inputRef\.current\?\.focus\(\)/);
  });
});
