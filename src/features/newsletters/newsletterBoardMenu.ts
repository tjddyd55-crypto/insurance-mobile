import type { DynamicNewsletterBoardMenuItem } from '../../navigation/nativeMenuPolicy';
import type { NewsletterBoard } from './types';

export const LOSS_ADJUSTER_SYSTEM_KEY = 'LOSS_ADJUSTER';

export function isLossAdjusterSystemMenuBoard(
  board: Pick<DynamicNewsletterBoardMenuItem, 'systemKey'> | Pick<NewsletterBoard, 'systemKey'>,
): boolean {
  return String(board.systemKey ?? '').trim().toUpperCase() === LOSS_ADJUSTER_SYSTEM_KEY;
}

export function mapNewsletterBoardsToMenuItems(
  boards: NewsletterBoard[],
): DynamicNewsletterBoardMenuItem[] {
  return boards.map((board) => ({
    label: board.label,
    slug: board.slug,
    boardScope: board.boardScope,
    systemKey: board.systemKey ?? null,
    isActive: board.isActive !== false,
  }));
}

/** 메뉴용: 손해사정사 시스템 보드를 일반 동적 보드에서 분리 */
export function partitionNewsletterBoardsForMenu(
  boards: DynamicNewsletterBoardMenuItem[],
): {
  lossAdjuster: DynamicNewsletterBoardMenuItem | null;
  dynamicBoards: DynamicNewsletterBoardMenuItem[];
} {
  let lossAdjuster: DynamicNewsletterBoardMenuItem | null = null;
  const dynamicBoards: DynamicNewsletterBoardMenuItem[] = [];
  for (const board of boards) {
    if (isLossAdjusterSystemMenuBoard(board)) {
      if (board.isActive !== false) lossAdjuster = board;
      continue;
    }
    dynamicBoards.push(board);
  }
  return { lossAdjuster, dynamicBoards };
}

export function buildNewsletterBoardViewPath(boardSlug: string): string {
  return `/portal/boards/${encodeURIComponent(boardSlug.trim())}`;
}
