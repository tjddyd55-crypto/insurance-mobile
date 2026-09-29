import type { NewsletterBoard } from './types';

export type DynamicNewsletterBoardMenuItem = {
  label: string;
  slug: string;
  boardScope: 'global' | 'ga';
  systemKey?: string | null;
  isActive?: boolean;
};

/** API가 동일 slug를 중복 반환할 때 menu child id(`newsletter-board-${slug}`) 충돌을 막는다. */
export function dedupeNewsletterBoardMenuItems(
  boards: DynamicNewsletterBoardMenuItem[],
): DynamicNewsletterBoardMenuItem[] {
  const seen = new Set<string>();
  const unique: DynamicNewsletterBoardMenuItem[] = [];
  for (const board of boards) {
    const slug = board.slug.trim();
    if (!slug) {
      continue;
    }
    const key = slug.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(board);
  }
  return unique;
}

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
