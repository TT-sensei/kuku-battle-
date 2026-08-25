export const SCHEMA_VERSION = 1;
export const FACTORS = Object.freeze([1,2,3,4,5,6,7,8,9]);
export const MODES = Object.freeze(['up','down','random']);

export function question(a, b) {
  return { factorA: Number(a), factorB: Number(b), answer: Number(a) * Number(b), key: `${a}x${b}` };
}

export function shuffle(items, random = Math.random) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function stageQuestions(factor, mode, random = Math.random) {
  const seconds = mode === 'down' ? [...FACTORS].reverse() : [...FACTORS];
  const rows = seconds.map((b) => question(factor, b));
  return mode === 'random' ? shuffle(rows, random) : rows;
}

export function bossQuestions(minFactor, maxFactor, random = Math.random) {
  const rows = [];
  for (let a = minFactor; a <= maxFactor; a += 1) {
    for (const b of FACTORS) rows.push(question(a, b));
  }
  return shuffle(rows, random);
}

export class QuestionBag {
  constructor(factory) { this.factory = factory; this.items = []; this.lastKey = ''; }
  next() {
    if (!this.items.length) this.items = this.factory();
    if (this.items.length > 1 && this.items[0].key === this.lastKey) {
      const swapAt = this.items.findIndex((item) => item.key !== this.lastKey);
      if (swapAt > 0) [this.items[0], this.items[swapAt]] = [this.items[swapAt], this.items[0]];
    }
    const item = this.items.shift();
    this.lastKey = item.key;
    return item;
  }
}

export function comboAnimation(combo) {
  if (combo >= 10 && combo % 5 === 0) return 'special';
  if (combo === 5) return 'attack';
  return 'normal';
}

export function emptyStat() {
  return { attempts:0, correct:0, wrong:0, recentResults:[], lastAskedAt:null, lastWrongAt:null, reviewActive:false, reviewCorrectStreak:0 };
}

export function recordAttempt(state, q, isCorrect, now = new Date().toISOString()) {
  const stat = state.multiplicationStats[q.key] || emptyStat();
  stat.attempts += 1;
  stat.correct += isCorrect ? 1 : 0;
  stat.wrong += isCorrect ? 0 : 1;
  stat.recentResults = [...stat.recentResults, Boolean(isCorrect)].slice(-10);
  stat.lastAskedAt = now;
  if (!isCorrect) {
    stat.lastWrongAt = now;
    stat.reviewActive = true;
    stat.reviewCorrectStreak = 0;
    if (!state.reviewQueue.includes(q.key)) state.reviewQueue.push(q.key);
  } else if (stat.reviewActive) {
    stat.reviewCorrectStreak += 1;
    if (stat.reviewCorrectStreak >= 2) {
      stat.reviewActive = false;
      state.reviewQueue = state.reviewQueue.filter((key) => key !== q.key);
    }
  }
  state.multiplicationStats[q.key] = stat;
  state.recentAttempts = [...(state.recentAttempts || []), { key:q.key, correct:Boolean(isCorrect), at:now }].slice(-200);
  return stat;
}

export function parseKey(key) {
  const [a,b] = String(key).split('x').map(Number);
  return question(a,b);
}

export function recentRate(stats) {
  if (!stats?.recentResults?.length) return 0;
  return Math.round(stats.recentResults.filter(Boolean).length / stats.recentResults.length * 100);
}

export function factorSummary(state, factor) {
  const stats = FACTORS.map((b) => state.multiplicationStats[`${factor}x${b}`]).filter(Boolean);
  const attempts = stats.reduce((sum,s) => sum + s.attempts, 0);
  const correct = stats.reduce((sum,s) => sum + s.correct, 0);
  const recent = (state.recentAttempts || []).filter((item) => item.key.startsWith(`${factor}x`)).slice(-30).map((item) => item.correct);
  const currentRate = recent.length ? Math.round(recent.filter(Boolean).length / recent.length * 100) : 0;
  const weakCount = stats.filter((s) => s.reviewActive).length;
  let grade = { mark:'－', label:'まだデータ不足' };
  if (attempts >= 10) {
    if (currentRate < 70 || weakCount >= 3) grade = { mark:'△', label:'特訓おすすめ' };
    else if (currentRate >= 90 && weakCount === 0) grade = { mark:'◎', label:'とくい' };
    else grade = { mark:'○', label:'もう少し' };
  }
  return { attempts, accuracy: attempts ? Math.round(correct / attempts * 100) : 0, recentRate: currentRate, weakCount, ...grade };
}

export function recommendedKeys(state, limit = 5) {
  return Object.entries(state.multiplicationStats)
    .filter(([,s]) => s.reviewActive)
    .sort(([,a],[,b]) => Number(b.reviewActive)-Number(a.reviewActive) || b.wrong-a.wrong || new Date(b.lastWrongAt||0)-new Date(a.lastWrongAt||0))
    .slice(0, limit).map(([key]) => key);
}

export function isBossUnlocked(state, bossId) {
  if (bossId === 'mid1') return [2,3,4,5].every((f) => state.stageProgress[f]?.random?.cleared);
  if (bossId === 'mid2') return [6,7,8,9].every((f) => state.stageProgress[f]?.random?.cleared);
  if (bossId === 'final') return Boolean(state.bossProgress.mid1?.defeated && state.bossProgress.mid2?.defeated);
  return false;
}

export function isMaster(state, factor) {
  const p = state.stageProgress[factor];
  return Boolean(p?.up?.cleared && p?.down?.cleared && p?.random?.cleared && p?.random?.noMiss);
}

export function defaultState() {
  const stageProgress = {};
  const mastery = {};
  for (const f of FACTORS) {
    stageProgress[f] = { up:{cleared:false}, down:{cleared:false}, random:{cleared:false,noMiss:false} };
    mastery[f] = false;
  }
  return {
    schemaVersion:SCHEMA_VERSION, selectedCharacter:'sora', trainingPartner:'kai', playerLevel:1, exp:0,
    supportMode:false, stageProgress, bossProgress:{mid1:{defeated:false},mid2:{defeated:false},final:{defeated:false}},
    multiplicationStats:{}, recentAttempts:[], reviewQueue:[], mastery, bestTimes:{normal:{},support:{}}, maxCombos:{},
    monsterBook:{}, monsterDefeatCounts:{}, collections:[], settings:{muted:false,volume:0.24},
    trainingExp:{date:'',earned:0}
  };
}

function mergeProgress(base, saved) {
  for (const f of FACTORS) for (const mode of MODES) base[f][mode] = { ...base[f][mode], ...(saved?.[f]?.[mode] || {}) };
  return base;
}

export function migrateState(saved) {
  const base = defaultState();
  if (!saved || typeof saved !== 'object') return base;
  const merged = { ...base, ...saved };
  merged.schemaVersion = SCHEMA_VERSION;
  merged.stageProgress = mergeProgress(base.stageProgress, saved.stageProgress);
  merged.bossProgress = { mid1:{...base.bossProgress.mid1,...saved.bossProgress?.mid1}, mid2:{...base.bossProgress.mid2,...saved.bossProgress?.mid2}, final:{...base.bossProgress.final,...saved.bossProgress?.final} };
  merged.settings = { ...base.settings, ...(saved.settings || {}) };
  merged.reviewQueue = [...new Set((saved.reviewQueue || []).filter((key) => /^\d+x\d+$/.test(key)))];
  return merged;
}

export function addExp(state, amount) {
  state.exp = Math.max(0, state.exp + Math.max(0, Number(amount) || 0));
  state.playerLevel = Math.min(100, Math.floor(state.exp / 100) + 1);
  return state.playerLevel;
}

export function trainingSeed(state, type, factor = null, preferredKeys = [], random = Math.random) {
  let pool = [];
  if (type === 'stage') pool = FACTORS.map((b) => question(factor,b));
  else {
    const keys = preferredKeys.length ? preferredKeys : state.reviewQueue;
    pool = keys.map(parseKey);
    if (type === 'auto') pool.push(...recommendedKeys(state, 9).map(parseKey));
  }
  if (!pool.length) pool = bossQuestions(1,9,random);
  const bag = shuffle([...new Map(pool.map((q) => [q.key,q])).values()], random);
  const result = [];
  while (result.length < 10) result.push(...shuffle(bag,random));
  return result.slice(0,10);
}

export class TrainingScheduler {
  constructor(seed, limit = 10) { this.queue = [...seed].slice(0,limit); this.limit=limit; this.index=0; }
  current() { return this.queue[this.index] || null; }
  advance(needsReview = false) {
    const current = this.current();
    this.index += 1;
    if (needsReview && current && this.index < this.limit) {
      const insertAt = Math.min(this.index + 3, this.limit - 1);
      this.queue.splice(insertAt, 0, current);
      this.queue = this.queue.slice(0,this.limit);
    }
    return this.current();
  }
}
