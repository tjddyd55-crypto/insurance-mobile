import {
  chunkStorageFileIds, mapStorageImpacts, retainFailedStorageSelection,
  storageBinderUsageMessage, storageDeleteSummary, toggleStorageSelection,
} from '../storageModel';

describe('file selection and deletion', () => {
  it('toggles without mutating selection and retains only failures', () => {
    const selected = [1, 2];
    expect(toggleStorageSelection(selected, 1)).toEqual([2]);
    expect(toggleStorageSelection(selected, 3)).toEqual([1, 2, 3]);
    expect(selected).toEqual([1, 2]);
    expect(retainFailedStorageSelection(selected, [2, 9])).toEqual([2]);
    expect(retainFailedStorageSelection(selected, [])).toEqual([]);
  });
  it('uses exact Korean result and binder usage copy', () => {
    expect(storageDeleteSummary(3, 0)).toBe('3개 삭제 완료');
    expect(storageDeleteSummary(0, 2)).toBe('0개 삭제 완료 / 2개 삭제 실패');
    expect(storageBinderUsageMessage([4])).toBe('이 파일은 4개의 바인더에서 사용 중입니다.');
    expect(storageBinderUsageMessage([2, 0, 4])).toBe('선택한 파일 중 2개가 바인더에서 사용 중입니다.');
  });
  it('deduplicates and chunks at 100 without losing IDs', () => {
    const ids = Array.from({ length: 201 }, (_, i) => i + 1);
    const chunks = chunkStorageFileIds([...ids, 1]);
    expect(chunks.map((chunk) => chunk.length)).toEqual([100, 100, 1]);
    expect(chunks.flat()).toEqual(ids);
    expect(chunkStorageFileIds([])).toEqual([]);
  });
  it('keeps at most three requests active and preserves input order', async () => {
    let active = 0;
    let peak = 0;
    const result = await mapStorageImpacts([1, 2, 3, 4, 5, 6, 7], async (id) => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 8 - id));
      active--;
      return id * 2;
    });
    expect(peak).toBe(3);
    expect(active).toBe(0);
    expect(result).toEqual([2, 4, 6, 8, 10, 12, 14]);
    const task = jest.fn();
    expect(await mapStorageImpacts([], task)).toEqual([]);
    expect(task).not.toHaveBeenCalled();
  });
  it('rejects when impact lookup fails so deletion cannot proceed', async () => {
    await expect(mapStorageImpacts([1], async () => { throw new Error('impact failed'); })).rejects.toThrow('impact failed');
  });
});
