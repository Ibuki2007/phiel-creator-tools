import test from 'node:test';
import assert from 'node:assert/strict';
import { createQuest, defaultState, levelFromXP, resetDailies, safeParseState, xpForLevel } from '../src/model.js';

test('レベルごとの必要XPが段階的に増える', () => {
  assert.equal(xpForLevel(1), 200);
  assert.deepEqual(levelFromXP(500), { level: 3, current: 50, needed: 300 });
});

test('難易度から既定XPを設定する', () => {
  assert.equal(createQuest({ title: ' テスト ', difficulty: 'HARD' }).xp, 70);
  assert.equal(createQuest({ title: 'テスト', difficulty: 'EASY', xp: 99 }).xp, 99);
});

test('日付が変わるとデイリーだけ未完了になる', () => {
  const state = defaultState();
  state.lastDailyReset = '2020-01-01';
  state.quests = state.quests.map((quest) => ({ ...quest, completed: true }));
  const reset = resetDailies(state, '2020-01-02');
  assert.equal(reset.quests.filter((q) => q.daily).every((q) => !q.completed), true);
  assert.equal(reset.quests.filter((q) => !q.daily).every((q) => q.completed), true);
});

test('バックアップ形式を検証する', () => {
  const state = defaultState();
  assert.deepEqual(safeParseState(JSON.stringify(state)), state);
  assert.equal(safeParseState('{broken'), null);
  assert.equal(safeParseState(JSON.stringify({ quests: [] })), null);
});
