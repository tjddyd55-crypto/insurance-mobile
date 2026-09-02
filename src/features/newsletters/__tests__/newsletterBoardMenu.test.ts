import {
  buildNewsletterBoardViewPath,
  isLossAdjusterSystemMenuBoard,
  partitionNewsletterBoardsForMenu,
} from '../newsletterBoardMenu';

describe('newsletterBoardMenu', () => {
  it('partitions LOSS_ADJUSTER from dynamic boards', () => {
    const { lossAdjuster, dynamicBoards } = partitionNewsletterBoardsForMenu([
      {
        label: '보상',
        slug: 'loss',
        boardScope: 'ga',
        systemKey: 'LOSS_ADJUSTER',
      },
      { label: '영진', slug: 'yeongjin', boardScope: 'ga' },
    ]);
    expect(lossAdjuster?.slug).toBe('loss');
    expect(dynamicBoards.map((board) => board.slug)).toEqual(['yeongjin']);
    expect(isLossAdjusterSystemMenuBoard({ systemKey: 'LOSS_ADJUSTER' })).toBe(true);
    expect(buildNewsletterBoardViewPath('yeongjin')).toBe('/portal/boards/yeongjin');
  });
});
