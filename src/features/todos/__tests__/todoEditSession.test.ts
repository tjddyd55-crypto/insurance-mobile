// @ts-nocheck
/* eslint-disable @typescript-eslint/no-require-imports */
import { returnToTodoList, shouldPopTodoStackToList, todoEditPath, todoEditScreenId } from '../todoNavigation';
import { resolveTodoFormSession, todoFormDraftFromRecord } from '../todoFormSession';

const fs = require('fs');
const path = require('path');

const todoStackState = {
  type: 'stack' as const,
  index: 1,
  routeNames: ['index', 'new', '[todoId]/edit'],
};

describe('todo edit session', () => {
  test('pops the todo stack back to the list instead of drawer history', () => {
    const dispatch = jest.fn();
    const replace = jest.fn();
    returnToTodoList(
      { getState: () => todoStackState, dispatch },
      { replace },
    );

    expect(shouldPopTodoStackToList(todoStackState)).toBe(true);
    expect(dispatch).toHaveBeenCalledWith({ type: 'POP_TO_TOP' });
    expect(replace).not.toHaveBeenCalled();
  });

  test('does not pop the app root or the home drawer route', () => {
    const dispatch = jest.fn();
    const replace = jest.fn();
    const rootStack = { type: 'stack' as const, index: 1, routeNames: ['(auth)', '(app)', 'index'] };
    const drawer = { type: 'drawer' as const, index: 3, routeNames: ['index', 'todos'] };

    expect(shouldPopTodoStackToList(rootStack)).toBe(false);
    expect(shouldPopTodoStackToList(drawer)).toBe(false);
    expect(shouldPopTodoStackToList({ type: 'stack', index: 0, routeNames: todoStackState.routeNames })).toBe(false);

    returnToTodoList({ getState: () => rootStack, dispatch }, { replace });
    expect(dispatch).not.toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith('/todos');
  });

  test('drops the previous draft when a different todo is selected', () => {
    expect(resolveTodoFormSession('todo-a', 'todo-b')).toBe('reset');
    expect(resolveTodoFormSession('todo-a', 'todo-a')).toBe('keep');
    expect(todoEditScreenId(['todo-a', 'todo-b'])).toBe('todo-b');
    expect(todoEditScreenId('')).toBeUndefined();
  });

  test('builds the edit path and draft from the newly selected todo', () => {
    expect(todoEditPath('todo-b')).toBe('/todos/todo-b/edit');
    expect(todoEditPath('todo-b')).not.toBe(todoEditPath('todo-a'));

    expect(todoFormDraftFromRecord({
      description: '',
      title: '두번째 할 일',
      dueDate: '2026-09-02',
      relatedEntityType: 'customer',
      relatedEntityId: '9',
      customerName: '김고객',
    })).toEqual({
      description: '두번째 할 일',
      dueDate: '2026-09-02',
      relatedCustomerId: '9',
      relatedCustomerName: '김고객',
    });
  });

  test('keeps todo edit on its own stack and does not retarget the app drawer', () => {
    const stackLayout = fs.readFileSync(
      path.join(__dirname, '../../../../app/(app)/todos/_layout.tsx'),
      'utf8',
    );
    const drawerLayout = fs.readFileSync(
      path.join(__dirname, '../../../../app/(app)/_layout.tsx'),
      'utf8',
    );
    const form = fs.readFileSync(path.join(__dirname, '../TodoFormScreen.tsx'), 'utf8');

    expect(stackLayout).toContain('Stack');
    expect(stackLayout).toContain("initialRouteName: 'index'");
    expect(drawerLayout).not.toContain('dangerouslySingular');
    expect(form).toContain('returnToTodoList');
    expect(form).not.toContain('router.back(');
  });

  test('route modules do not import react-navigation', () => {
    const navigation = fs.readFileSync(path.join(__dirname, '../todoNavigation.ts'), 'utf8');
    const drawer = fs.readFileSync(path.join(__dirname, '../../../navigation/openAppDrawer.ts'), 'utf8');
    const specifiers = collectRouteImportSpecifiers();
    expect(navigation).not.toMatch(/@react-navigation\//);
    expect(drawer).not.toMatch(/@react-navigation\//);
    expect(specifiers).toContain('../../../../src/features/todos/todoNavigation');
    expect(specifiers).toContain('../navigation/openAppDrawer');
    expect(specifiers.filter((specifier) => specifier.startsWith('@react-navigation/'))).toEqual([]);
  });
});

function collectRouteImportSpecifiers() {
  const appDir = path.join(__dirname, '../../../../app');
  const specifiers = new Set();
  const seen = new Set();

  function visit(filePath) {
    const resolved = resolveSourceFile(filePath);
    if (!resolved || seen.has(resolved)) return;
    seen.add(resolved);
    const source = fs.readFileSync(resolved, 'utf8');
    for (const specifier of readImportSpecifiers(source)) {
      specifiers.add(specifier);
      if (specifier.startsWith('.')) {
        visit(path.resolve(path.dirname(resolved), specifier));
      } else if (specifier.startsWith('@/')) {
        visit(path.join(__dirname, '../../../..', specifier.slice(2)));
      }
    }
  }

  for (const file of walkFiles(appDir)) visit(file);
  return [...specifiers];
}

function walkFiles(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walkFiles(fullPath));
    else if (/\.[cm]?[jt]sx?$/.test(entry.name)) files.push(fullPath);
  }
  return files;
}

function resolveSourceFile(filePath) {
  const candidates = [
    filePath,
    `${filePath}.ts`,
    `${filePath}.tsx`,
    path.join(filePath, 'index.ts'),
    path.join(filePath, 'index.tsx'),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
}

function readImportSpecifiers(source) {
  const withoutComments = source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  const specifiers = [];
  const pattern = /(?:import|export)\s+(?:type\s+)?(?:[^;]*?\sfrom\s+)?['"]([^'"]+)['"]|require\(\s*['"]([^'"]+)['"]\s*\)/g;
  for (const match of withoutComments.matchAll(pattern)) {
    specifiers.push(match[1] || match[2]);
  }
  return specifiers;
}
