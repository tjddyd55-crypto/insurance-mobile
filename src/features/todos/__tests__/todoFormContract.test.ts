// @ts-nocheck
const fs = require('fs');
const path = require('path');

describe('todoFormContract', () => {
  it('does not expose deadline suggestion UI in native todo form', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'TodoFormScreen.tsx'),
      'utf8',
    );
    expect(source).not.toMatch(/suggestTodoDueDate/);
    expect(source).not.toMatch(/본문에 오늘·내일·모레/);
    expect(source).not.toMatch(/label="제안"/);
  });

  it('skips updateTodo when the edit draft has no saved-field change', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'TodoFormScreen.tsx'),
      'utf8',
    );
    const guard = source.indexOf('isTodoEditDraftChanged(JSON.parse(initialSnapshot)');
    const update = source.indexOf('return updateTodo(token');
    expect(guard).toBeGreaterThan(-1);
    expect(update).toBeGreaterThan(guard);
  });

  it('edit mode exposes complete/reopen separate from delete', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'TodoFormScreen.tsx'),
      'utf8',
    );
    expect(source).toMatch(/완료 처리/);
    expect(source).toMatch(/완료 취소/);
    expect(source).toMatch(/할 일 삭제/);
    expect(source).toMatch(/statusMutation/);
    expect(source).toMatch(/completeTodo/);
    expect(source).toMatch(/reopenTodo/);
    const completeBtn = source.indexOf(
      "label={editingTodo.status === 'completed' ? '완료 취소' : '완료 처리'}",
    );
    const deleteBtn = source.indexOf('label="할 일 삭제"');
    expect(completeBtn).toBeGreaterThan(-1);
    expect(deleteBtn).toBeGreaterThan(completeBtn);
  });
});
