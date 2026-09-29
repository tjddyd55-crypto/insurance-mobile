export type MemoFontWeight = 'normal' | 'bold';

export type MemoRecord = {
  id: string;
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  fontSize: number;
  fontWeight: MemoFontWeight;
  createdAt: string | null;
  updatedAt: string | null;
};
