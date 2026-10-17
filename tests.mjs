import assert from 'node:assert/strict';
import { ACHIEVEMENT_BADGES, MATH_BADGES } from './data.js';
import { defaultState, stageQuestions, getStageRewardExp, bossQuestions, comboAnimation, question, recordAttempt, TrainingScheduler, migrateState, isBossUnlocked, isMaster, trainingSeed, recommendedKeys, questionStatus } from './logic.js';

assert.equal(ACHIEVEMENT_BADGES.length,40);
assert.equal(MATH_BADGES.length,25);
assert.equal(new Set([...ACHIEVEMENT_BADGES,...MATH_BADGES].map((badge)=>badge.id)).size,65);
assert.equal(MATH_BADGES.filter((badge)=>badge.criteria!=='このアプリでは獲得判定しない').length,9);
assert.ok(ACHIEVEMENT_BADGES.some((badge)=>badge.id==='facts-81'));
assert.ok(ACHIEVEMENT_BADGES.some((badge)=>badge.id==='retained-10'));

assert.deepEqual(stageQuestions(7,'up').map(q=>q.factorB), [1,2,3,4,5,6,7,8,9]);
assert.deepEqual(stageQuestions(7,'down').map(q=>q.factorB), [9,8,7,6,5,4,3,2,1]);
assert.ok(bossQuestions(2,5).every(q=>q.factorA>=2 && q.factorA<=5));
assert.ok(bossQuestions(6,9).every(q=>q.factorA>=6 && q.factorA<=9));
assert.deepEqual(new Set(bossQuestions(1,9).map(q=>q.factorA)), new Set([1,2,3,4,5,6,7,8,9]));
for (const n of [10,15,20,25,30]) assert.equal(comboAnimation(n),'special');
for (const n of [6,7,8,9,11,12,13,14]) assert.notEqual(comboAnimation(n),'special');
assert.equal(comboAnimation(5),'special');
assert.equal(comboAnimation(6),'attack');

const rewardState=defaultState();
assert.equal(getStageRewardExp(rewardState,7,20,'2026-08-25'),20);
assert.equal(getStageRewardExp(rewardState,7,20,'2026-08-25'),15);
assert.equal(getStageRewardExp(rewardState,7,20,'2026-08-25'),10);
assert.equal(getStageRewardExp(rewardState,7,20,'2026-08-25'),5);
assert.equal(getStageRewardExp(rewardState,7,20,'2026-08-26'),20);

const state=defaultState();
const q=question(6,7);
recordAttempt(state,q,false,'2026-01-01T00:00:00Z');
assert.deepEqual(state.reviewQueue,['6x7']);
const filler=[question(2,2),question(3,3),question(4,4),question(5,5),question(6,6),question(7,7),question(8,8),question(9,9),question(2,3)];
const scheduler=new TrainingScheduler([q,...filler]);
assert.equal(scheduler.current().key,'6x7');
scheduler.advance(true);
assert.notEqual(scheduler.current().key,'6x7');
scheduler.advance(); scheduler.advance(); scheduler.advance();
assert.equal(scheduler.current().key,'6x7');
recordAttempt(state,q,true,'2026-01-01T00:01:00Z');
assert.equal(state.multiplicationStats['6x7'].reviewActive,true);
// 同じ九九をすぐ続けて正解しても、克服にはしない。
recordAttempt(state,q,true,'2026-01-01T00:01:05Z');
assert.equal(state.multiplicationStats['6x7'].reviewActive,true);
recordAttempt(state,question(2,2),true,'2026-01-01T00:01:10Z');
recordAttempt(state,question(3,3),true,'2026-01-01T00:01:20Z');
recordAttempt(state,question(4,4),true,'2026-01-01T00:01:30Z');
recordAttempt(state,q,true,'2026-01-01T00:02:00Z');
assert.equal(state.multiplicationStats['6x7'].reviewActive,false);
assert.equal(state.multiplicationStats['6x7'].retentionConfirmedAt,'2026-01-01T00:02:00Z');
assert.equal(questionStatus(state,'6x7'),'retained');
assert.equal(questionStatus(state,'2x2'),'recorded');
assert.deepEqual(state.reviewQueue,[]);
const retentionRetry = JSON.parse(JSON.stringify(state));
recordAttempt(retentionRetry,q,false,'2026-01-01T00:03:00Z');
assert.equal(retentionRetry.multiplicationStats['6x7'].retentionConfirmedAt,null);
assert.equal(retentionRetry.multiplicationStats['6x7'].reviewActive,true);

const recommendationState=defaultState();
recommendationState.multiplicationStats['2x3']={attempts:4,correct:2,wrong:2,recentResults:[false,false,true],reviewActive:false,lastWrongAt:'2026-01-01T00:00:00Z'};
assert.ok(recommendedKeys(recommendationState,5).includes('2x3'));
assert.equal(questionStatus(recommendationState,'2x3'),'needs-review');
assert.equal(questionStatus(recommendationState,'9x9'),'unseen');
recordAttempt(recommendationState,question(2,3),true,'2026-01-02T00:00:00Z');
assert.equal(recommendationState.multiplicationStats['2x3'].reviewActive,true);
assert.ok(recommendationState.reviewQueue.includes('2x3'));

const focusedSeed = trainingSeed(defaultState(),'battle',null,['6x7'],()=>0.25);
assert.equal(focusedSeed.length,10);
assert.equal(new Set(focusedSeed.map((item)=>item.key)).size,10);
assert.equal(focusedSeed.filter((item)=>item.key==='6x7').length,1);
const spacedScheduler = new TrainingScheduler(focusedSeed);
const first = spacedScheduler.current();
spacedScheduler.advance(true);
assert.notEqual(spacedScheduler.current().key,first.key);
spacedScheduler.advance(); spacedScheduler.advance(); spacedScheduler.advance();
assert.equal(spacedScheduler.current().key,first.key);
// 終盤に間違えても、3問はさんだ再挑戦をキューに入れる。
const lateScheduler = new TrainingScheduler(focusedSeed);
for (let i=0;i<8;i+=1) lateScheduler.advance();
const lateQuestion = lateScheduler.current();
lateScheduler.advance(true);
lateScheduler.advance(); lateScheduler.advance(); lateScheduler.advance();
assert.equal(lateScheduler.current().key,lateQuestion.key);

const restored=migrateState(JSON.parse(JSON.stringify({...state,playerLevel:12,collections:['dragon']})));
assert.equal(restored.playerLevel,12);
assert.deepEqual(restored.collections,['dragon']);
assert.equal(restored.multiplicationStats['6x7'].wrong,1);
// ボスは学習順序を固定せず、最初からすべて選べる。
for (const id of ['mid1','mid2','final']) assert.equal(isBossUnlocked(defaultState(),id),true);
assert.equal(isBossUnlocked(defaultState(),'unknown'),false);
state.stageProgress[7].up.cleared=true; state.stageProgress[7].down.cleared=true;
state.stageProgress[7].random={cleared:true,noMiss:true};
assert.equal(isMaster(state,7),true);
const savedAgain=migrateState(JSON.parse(JSON.stringify({...state,monsterBook:{slime:true},monsterDefeatCounts:{slime:2},mastery:{...state.mastery,7:true},maxCombos:{'7-random':9}})));
assert.equal(savedAgain.monsterBook.slime,true);
assert.equal(savedAgain.mastery[7],true);
assert.equal(savedAgain.maxCombos['7-random'],9);
console.log('All multiplication, SPECIAL, reviewQueue and persistence tests passed.');
