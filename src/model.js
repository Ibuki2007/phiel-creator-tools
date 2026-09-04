export const STORAGE_KEY = 'life-quest-board-v1';

export const difficultyXP = { EASY: 20, NORMAL: 40, HARD: 70, EPIC: 120 };

export function xpForLevel(level) {
  return 200 + (level - 1) * 50;
}

export function levelFromXP(totalXP) {
  let level = 1;
  let remaining = Math.max(0, totalXP);
  while (remaining >= xpForLevel(level)) {
    remaining -= xpForLevel(level);
    level += 1;
  }
  return { level, current: remaining, needed: xpForLevel(level) };
}

export function createQuest(values = {}) {
  const difficulty = values.difficulty || 'NORMAL';
  return {
    id: values.id || crypto.randomUUID(),
    title: values.title?.trim() || '新しいクエスト',
    category: values.category || '創作',
    type: values.type || 'sub',
    difficulty,
    xp: Number(values.xp) || difficultyXP[difficulty],
    priority: values.priority || 'medium',
    duration: Number(values.duration) || 15,
    deadline: values.deadline || '',
    mini: values.mini?.trim() || '',
    daily: Boolean(values.daily),
    completed: Boolean(values.completed),
    completedAt: values.completedAt || null,
    createdAt: values.createdAt || new Date().toISOString()
  };
}

export function defaultState() {
  const today = new Date().toISOString().slice(0, 10);
  return {
    playerName: 'PHIEL',
    totalXP: 180,
    lastDailyReset: today,
    quests: [
      createQuest({ title: '配信の企画を1つ決める', category: 'VTuber', type: 'main', difficulty: 'HARD', priority: 'high', duration: 30, mini: '候補を3つメモする' }),
      createQuest({ title: 'ボイスを1本収録する', category: '音声', type: 'main', difficulty: 'NORMAL', priority: 'high', duration: 20, mini: 'マイクを接続してテスト録音' }),
      createQuest({ title: 'ジェスチャードローイング', category: 'イラスト', difficulty: 'EASY', duration: 15, mini: '1ポーズだけ描く', daily: true }),
      createQuest({ title: 'デスクをリセット', category: '生活', difficulty: 'EASY', duration: 5, mini: 'ゴミを1つ捨てる', daily: true }),
      createQuest({ title: '作品の設定資料を整理', category: '創作', difficulty: 'NORMAL', duration: 25, mini: 'ファイルを1つ開く' })
    ]
  };
}

export function resetDailies(state, today = new Date().toISOString().slice(0, 10)) {
  if (state.lastDailyReset === today) return state;
  return {
    ...state,
    lastDailyReset: today,
    quests: state.quests.map((quest) => quest.daily ? { ...quest, completed: false, completedAt: null } : quest)
  };
}

export function safeParseState(raw) {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    if (!value || !Array.isArray(value.quests) || typeof value.totalXP !== 'number') return null;
    return value;
  } catch {
    return null;
  }
}
