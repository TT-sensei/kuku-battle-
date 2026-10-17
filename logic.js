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
  if (combo >= 5 && combo % 5 === 0) return 'special';
  return 'attack';
}

export function emptyStat() {
  return { attempts:0, correct:0, wrong:0, recentResults:[], lastAskedAt:null, lastWrongAt:null, reviewActive:false, reviewCorrectStreak:0, reviewLastCorrectAt:null };
}

export function recordAttempt(state, q, isCorrect, now = new Date().toISOString()) {
  const stat = state.multiplicationStats[q.key] || emptyStat();
  stat.attempts += 1;
  stat.correct += isCorrect ? 1 : 0;
  stat.wrong += isCorrect ? 0 : 1;
  stat.recentResults = [...stat.recentResults, Boolean(isCorrect)].slice(-10);
  stat.lastAskedAt = now;
  const previousAttempts = state.recentAttempts || [];

  if (!isCorrect) {
    stat.lastWrongAt = now;
    stat.reviewActive = true;
    stat.reviewCorrectStreak = 0;
    stat.reviewLastCorrectAt = null;
    if (!state.reviewQueue.includes(q.key)) state.reviewQueue.push(q.key);
  } else if (stat.reviewActive) {
    // 古い保存データには reviewLastCorrectAt がないため、最初の正解を基準点にする。
    if (!stat.reviewLastCorrectAt || !stat.reviewCorrectStreak) {
      stat.reviewCorrectStreak = 1;
      stat.reviewLastCorrectAt = now;
    } else {
      let baselineIndex = -1;
      for (let i = previousAttempts.length - 1; i >= 0; i -= 1) {
        const item = previousAttempts[i];
        if (item.key === q.key && item.correct && item.at === stat.reviewLastCorrectAt) {
          baselineIndex = i;
          break;
        }
      }
      if (baselineIndex < 0) {
        stat.reviewCorrectStreak = 1;
        stat.reviewLastCorrectAt = now;
      } else {
        const interveningKeys = new Set(
          previousAttempts.slice(baselineIndex + 1)
            .filter((item) => item.key !== q.key)
            .map((item) => item.key)
        );
        // 別の九九を3種類解いた後の正解だけを、間隔を空けた正解として数える。
        if (interveningKeys.size >= 3) {
          stat.reviewCorrectStreak += 1;
          stat.reviewLastCorrectAt = now;
          if (stat.reviewCorrectStreak >= 2) {
            stat.reviewActive = false;
            stat.reviewLastCorrectAt = null;
            state.reviewQueue = state.reviewQueue.filter((key) => key !== q.key);
          }
        }
      }
    }
  }

  state.multiplicationStats[q.key] = stat;
  state.recentAttempts = [...previousAttempts, { key:q.key, correct:Boolean(isCorrect), at:now }].slice(-200);
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
    monsterBook:{}, monsterDefeatCounts:{}, collections:[], settings:{muted:false,volume:0.24,showKukuWords:true},
    adventureReward:{date:'',byFactor:{}},
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
  merged.adventureReward = { ...base.adventureReward, ...(saved.adventureReward || {}), byFactor:{ ...(saved.adventureReward?.byFactor || {}) } };
  merged.reviewQueue = [...new Set((saved.reviewQueue || []).filter((key) => /^\d+x\d+$/.test(key)))];
  return merged;
}

export function getStageRewardExp(state, factor, baseAmount, today = new Date().toISOString().slice(0,10)) {
  if (state.adventureReward.date !== today) {
    state.adventureReward = { date:today, byFactor:{} };
  }
  const count = Number(state.adventureReward.byFactor[factor] || 0);
  const multiplier = [1, 0.75, 0.5, 0.25][Math.min(count, 3)];
  state.adventureReward.byFactor[factor] = count + 1;
  return Math.max(3, Math.round(baseAmount * multiplier));
}

export function addExp(state, amount) {
  state.exp = Math.max(0, state.exp + Math.max(0, Number(amount) || 0));
  state.playerLevel = Math.min(100, Math.floor(state.exp / 100) + 1);
  return state.playerLevel;
}

export function trainingSeed(state, type, factor = null, preferredKeys = [], random = Math.random) {
  let pool = [];
  if (type === 'stage') {
    pool = FACTORS.map((b) => question(factor,b));
  } else {
    const keys = preferredKeys.length ? preferredKeys : state.reviewQueue;
    pool = keys
      .filter((key) => /^[1-9]x[1-9]$/.test(String(key)))
      .map(parseKey);
    if (type === 'auto') pool.push(...recommendedKeys(state, 9).map(parseKey));
  }

  // 最初の10問では同じ九九を重ねず、苦手な問題の間に別の九九を挟む。
  const focus = [...new Map(pool.map((q) => [q.key,q])).values()];
  const allQuestions = FACTORS.flatMap((a) => FACTORS.map((b) => question(a,b)));
  const focusKeys = new Set(focus.map((q) => q.key));
  const mixed = allQuestions.filter((q) => !focusKeys.has(q.key));
  const uniqueFocus = shuffle(focus,random).slice(0,10);
  const fillers = shuffle(mixed,random).slice(0,Math.max(0,10-uniqueFocus.length));
  const seed = shuffle([...uniqueFocus,...fillers],random);

  // 記録がない場合も、重複のない10問で練習を始められる。
  if (seed.length < 10) {
    const used = new Set(seed.map((q) => q.key));
    seed.push(...shuffle(allQuestions.filter((q) => !used.has(q.key)),random).slice(0,10-seed.length));
  }
  return seed.slice(0,10);
}

export class TrainingScheduler {
  constructor(seed, limit = 10) {
    this.queue = [...seed].slice(0,limit);
    this.seed = [...this.queue];
    this.index = 0;
    this.reviewInsertions = 0;
    this.maxReviewInsertions = 10;
    this.fillerCursor = 0;
  }
  current() { return this.queue[this.index] || null; }
  remaining() { return Math.max(0,this.queue.length-this.index); }
  advance(needsReview = false) {
    const current = this.current();
    this.index += 1;
    if (needsReview && current && this.reviewInsertions < this.maxReviewInsertions) {
      const insertAt = this.index + 3;
      // 終盤の誤答でも、別の問題を3問はさんで再挑戦できるようにする。
      while (this.queue.length < insertAt) {
        let filler = this.seed[this.fillerCursor % this.seed.length];
        this.fillerCursor += 1;
        if (!filler || filler.key === current.key) {
          filler = this.seed.find((item) => item.key !== current.key) || current;
        }
        this.queue.push(filler);
      }
      this.queue.splice(insertAt,0,current);
      this.reviewInsertions += 1;
    }
    return this.current();
  }
}
