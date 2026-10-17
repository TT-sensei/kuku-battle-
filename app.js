import { enableFurigana } from './furigana.js';
import { EDU_EVENTS, StorageManager, ScreenManager, CountdownTimer, ScoreManager, ComboManager, AnswerChecker } from 'https://tt-sensei.github.io/edu-components/index.js';
import { soundList } from 'https://tt-sensei.github.io/sounds-recipe-/sounds.js';
import { CHARACTERS, NORMAL_MONSTERS, NORMAL_MONSTER_GROUPS, BOSS_CANDIDATES, BOSSES, BACKGROUNDS, PREP_GROUP_IMAGE, COLLECTIONS, MATH_BADGES, ACHIEVEMENT_BADGES, ENCOURAGEMENT } from './data.js';
import { FACTORS, MODES, QuestionBag, TrainingScheduler, addExp, getStageRewardExp, bossQuestions, comboAnimation, defaultState, factorSummary, isBossUnlocked, isMaster, migrateState, parseKey, question, questionStatus, recommendedKeys, recordAttempt, stageQuestions, trainingSeed } from './logic.js';

const $=(selector,root=document)=>root.querySelector(selector);
const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];
const storage=new StorageManager('kuku-fantasy-battle');
let state=migrateState(storage.load('state',defaultState()));
const screenManager=new ScreenManager({screens:$$('.screen')});
const checker=new AnswerChecker({eventTarget:document});
let currentFactor=1;
let pendingBattle=null;
let battle=null;
let training=null;
let audioContext=null;

const MODE_LABEL={up:'のぼり',down:'くだり',random:'ランダム'};
const KUKU_WORDS = [
  ['いんいちが','いんにが','いんさんが','いんしが','いんごが','いんろくが','いんしちが','いんはちが','いんくが'],
  ['にいちが','ににんが','にさんが','にしが','にご','にろく','にしち','にはち','にく'],
  ['さんいちが','さんにが','さざんが','さんし','さんご','さぶろく','さんしち','さんぱ','さんく'],
  ['しいちが','しにが','しさん','しし','しご','しろく','ししち','しはち','しく'],
  ['ごいちが','ごに','ごさん','ごし','ごご','ごろく','ごしち','ごは','ごっく'],
  ['ろくいちが','ろくに','ろくさん','ろくし','ろくご','ろくろく','ろくしち','ろくは','ろっく'],
  ['しちいちが','しちに','しちさん','しちし','しちご','しちろく','しちしち','しちは','しちく'],
  ['はちいちが','はちに','はちさん','はちし','はちご','はちろく','はちしち','はっぱ','はっく'],
  ['くいちが','くに','くさん','くし','くご','くろく','くしち','くはち','くく']
];

function kukuWord(q){
  return KUKU_WORDS[q.factorA-1]?.[q.factorB-1] || '';
}

function renderQuestion(prefix,q){
  const word = $('#' + prefix + '-kuku-word');
  const equation = $('#' + prefix + '-equation');
  word.textContent = kukuWord(q);
  word.hidden = state.settings.showKukuWords === false;
  equation.textContent = q.factorA + ' × ' + q.factorB + ' ＝';
}

const BOSS_CONFIG={
  mid1:{title:'中ボス1・2〜5の段',hp:16,time:90,min:2,max:5,monster:BOSSES.mid1},
  mid2:{title:'中ボス2・6〜9の段',hp:16,time:90,min:6,max:9,monster:BOSSES.mid2},
  final:{title:'大ボス・1〜9すべて',hp:20,time:120,min:1,max:9,monster:BOSSES.final}
};

function save(){
  // バッジは一度獲得したら、あとで正答率が変わっても獲得済みのまま残す。
  const snapshot=badgeSnapshot();
  const newlyEarned=[...ACHIEVEMENT_BADGES,...MATH_BADGES].filter((item)=>badgeStatus(item,snapshot).got).map((item)=>item.id);
  state.earnedBadges=[...new Set([...(state.earnedBadges||[]),...newlyEarned])];
  storage.save('state',state);
}
function pick(list){ return list[Math.floor(Math.random()*list.length)]; }
function normalMonsterForFactor(factor){ return pick(NORMAL_MONSTER_GROUPS[Math.floor((factor-1)/3)]); }
function bossMonsterForId(bossId){ return pick(BOSS_CANDIDATES[bossId]); }
function setImage(img,src){ img.src=src; img.onerror=()=>{img.hidden=true;}; img.onload=()=>{img.hidden=false;}; }
function formatFormula(q){ return `${q.factorA}×${q.factorB}＝${q.answer}`; }
function formatTime(seconds){ const s=Math.max(0,Math.round(seconds)); return s>=60?`${Math.floor(s/60)}分${s%60}秒`:`${s}秒`; }

async function playSound(id){
  if(state.settings.muted) return;
  try{
    audioContext ||= new (window.AudioContext||window.webkitAudioContext)();
    if(audioContext.state==='suspended') await audioContext.resume();
    soundList.find((item)=>item.id===id)?.play(audioContext,state.settings.volume);
  }catch{}
}

function show(id){
  if(battle?.timer?.isRunning && id!=='battle') battle.timer.pause();
  screenManager.show(id);
  if(id==='home') renderHome();
  if(id==='adventure') renderAdventure();
  if(id==='training-menu') renderTrainingMenu();
  if(id==='map') renderMap();
  if(id==='book') renderBook();
  if(id==='collection') renderCollection();
  if(id==='settings') renderSettings();
  if(id==='characters') renderCharacters(false);
  if(id==='partner-select') renderCharacters(true);
}

function renderHome(){
  const hero=CHARACTERS[state.selectedCharacter];
  $('#home').style.backgroundImage=`linear-gradient(110deg,rgba(255,253,248,.72),rgba(255,253,248,.28)),url("${BACKGROUNDS.home}")`;
  $('#home').style.backgroundSize='cover';
  $('#home').style.backgroundPosition='center';
  $('#home-level').textContent=state.playerLevel;
  $('#home-role').textContent=hero.role;
  setImage($('#home-character'),hero.stand);
  const count=recommendedKeys(state,9).length;
  $('#home-review').textContent=count?`特訓おすすめが ${count}問 あります`:'今はおすすめの特訓はないよ';
  // HTMLとJSのキャッシュが一時的にずれても、起動画面を止めない
  const nextTitle=$('#home-next-title'), nextDetail=$('#home-next-detail'), nextButton=$('#home-continue');
  if(nextTitle && nextDetail && nextButton){
    if(count){
      nextTitle.textContent='苦手な九九をへらそう！';
      nextDetail.textContent='いま '+count+'問が特訓まち。仲間とゆっくりれんしゅうしよう。';
      nextButton.innerHTML='特訓する <span aria-hidden="true">→</span>';
      nextButton.dataset.target='training-menu';
    }else{
      nextTitle.textContent='つぎの冒険へ出発！';
      nextDetail.textContent='段をえらんで、九九バトルにちょうせんしよう。';
      nextButton.innerHTML='冒険する <span aria-hidden="true">→</span>';
      nextButton.dataset.target='adventure';
    }
  }
}

function renderCharacters(partnerMode){
  const grid=$(partnerMode?'#partner-grid':'#character-grid');
  grid.innerHTML='';
  Object.entries(CHARACTERS).forEach(([id,char])=>{
    if(partnerMode && id===state.selectedCharacter) return;
    const button=document.createElement('button');
    const selected=(partnerMode?state.trainingPartner:state.selectedCharacter)===id;
    button.className=`character-card${selected?' selected':''}`;
    button.innerHTML=`<img src="${char.stand}" alt=""><strong>${char.role}</strong>`;
    button.addEventListener('click',()=>{
      if(partnerMode) state.trainingPartner=id;
      else {
        state.selectedCharacter=id;
        if(state.trainingPartner===id) state.trainingPartner=Object.keys(CHARACTERS).find((key)=>key!==id);
      }
      save(); show(partnerMode?'training-menu':'home');
    });
    grid.append(button);
  });
}

function renderAdventure(){
  const adventure=$('#adventure');
  adventure.style.backgroundImage='none';
  const stages=$('#stage-grid');
  stages.innerHTML='';
  stages.setAttribute('aria-label','1から9の段を選ぶ冒険マップ');

  let routeNote=$('#adventure-route-note');
  if(!routeNote){
    routeNote=document.createElement('div');
    routeNote.id='adventure-route-note';
    routeNote.className='adventure-route-note';
    stages.before(routeNote);
  }
  routeNote.innerHTML='<div class="route-note-mark" aria-hidden="true">🧭</div><div><strong>9つの段をめぐる冒険へ！</strong><span>好きな場所から挑戦OK。のぼり・くだり・ランダムをクリアして、仲間と強くなろう。</span></div><div class="route-regions" aria-hidden="true"><span>🌿 草原</span><span>🌊 湖</span><span>⛰️ 山</span></div>';

  FACTORS.forEach((factor)=>{
    const summary=factorSummary(state,factor);
    const progress=state.stageProgress[factor];
    const cleared=['up','down','random'].filter(mode=>progress[mode].cleared).length;
    const master=isMaster(state,factor);
    const region=factor<=3?'🌿 はじまりの草原':factor<=6?'🌊 きらめきの湖':'⛰️ ひかりの山';
    const button=document.createElement('button');
    button.className=`stage-card adventure-stage stage-region-${factor<=3?'forest':factor<=6?'lake':'mountain'}${master?' master':''}`;
    button.setAttribute('aria-label',`${factor}の段。挑戦する`);
    button.innerHTML=`<span class="stage-region">${region}</span><span class="stage-number-wrap"><strong>${factor}</strong><span class="stage-unit">の段</span><span class="stage-island-icon" aria-hidden="true">${factor<=3?'🌱':factor<=6?'💎':'⭐'}</span></span><span class="stage-status ${master?'status-master':summary.weakCount?'status-practice':'status-normal'}">${master?'👑 MASTER':summary.weakCount?'🔥 特訓しよう':summary.attempts?summary.mark+' '+summary.label:'✨ これから挑戦'}</span><span class="stage-route-progress" aria-label="クリアしたモード ${cleared} / 3">${['up','down','random'].map(mode=>`<i class="${progress[mode].cleared?'done':''}"></i>`).join('')}</span><span class="stage-action">${cleared===3?'もう一度挑戦':'冒険に出発'} <b aria-hidden="true">→</b></span>`;
    button.addEventListener('click',()=>{currentFactor=factor;$('#mode-factor').textContent=factor;show('stage-modes');});
    stages.append(button);
  });
  const bosses=$('#boss-grid'); bosses.innerHTML='';
  Object.entries(BOSS_CONFIG).forEach(([id,config])=>{
    const unlocked=isBossUnlocked(state,id);
    const button=document.createElement('button');
    button.className=`boss-card adventure-boss${state.bossProgress[id].defeated?' defeated':''}${unlocked?'':' locked'}`;
    button.innerHTML=`<img src="${config.monster.image}" alt=""><span class="boss-copy"><span class="boss-eyebrow">${id==='final'?'最終エリア':'ボスチャレンジ'}</span><strong>${config.title}</strong><small>${state.bossProgress[id].defeated?'🏆 撃破済み・何度でも挑戦OK':'⚔️ 挑戦できるよ！'}</small></span><span class="boss-arrow" aria-hidden="true">→</span>`;
    button.addEventListener('click',()=>unlocked && prepareBattle({kind:'boss',bossId:id}));
    bosses.append(button);
  });
}

function prepareBattle(config){
  pendingBattle={...config};
  const normal=config.kind==='normal';
  const maxHp=normal?9:BOSS_CONFIG[config.bossId].hp;
  const baseTime=normal?60:BOSS_CONFIG[config.bossId].time;
  $('#prep-title').textContent=normal?`${config.factor}の段・${MODE_LABEL[config.mode]}`:BOSS_CONFIG[config.bossId].title;
  $('#prep-rule').textContent=`HP ${maxHp}｜${baseTime}秒｜正解は必ず1ダメージ`;
  $('#prep-support').checked=state.supportMode;
  $('#support-detail').textContent=`HP7・時間${baseTime+(normal?30:config.bossId==='final'?40:30)}秒`;
  setImage($('#prep-player'),CHARACTERS[state.selectedCharacter].stand);
  setImage($('#prep-team'),PREP_GROUP_IMAGE);
  show('battle-prep');
}

function setupKeypad(container,input,onSubmit,onChange){
  container.innerHTML='';
  const keys=['1','2','3','4','5','6','7','8','9','delete','0','enter'];
  keys.forEach((key)=>{
    const button=document.createElement('button'); button.type='button'; button.dataset.key=key;
    button.textContent=key==='delete'?'×':key==='enter'?'決定':key;
    button.addEventListener('click',()=>{
      if(key==='enter'){
        onSubmit(input.value);
        return;
      }
      if(key==='delete') input.value=input.value.slice(0,-1);
      else if(input.value.length<2) input.value+=key;
      onChange(input.value);
    });
    container.append(button);
  });
}

function battleConfig(){
  const support=$('#prep-support').checked;
  state.supportMode=support; save();
  if(pendingBattle.kind==='normal'){
    return {...pendingBattle,support,playerMaxHp:support?7:5,enemyMaxHp:9,time:support?90:60,monster:normalMonsterForFactor(pendingBattle.factor),background:BACKGROUNDS.normal};
  }
  const boss=BOSS_CONFIG[pendingBattle.bossId];
  const extra=pendingBattle.bossId==='final'?40:30;
  return {...pendingBattle,support,playerMaxHp:support?7:5,enemyMaxHp:boss.hp,time:boss.time+(support?extra:0),monster:bossMonsterForId(pendingBattle.bossId),background:BACKGROUNDS[pendingBattle.bossId],min:boss.min,max:boss.max};
}

function startBattle(){
  const config=battleConfig();
  const eventTarget=new EventTarget();
  const input=$('#battle-answer');
  const score=new ScoreManager();
  const combo=new ComboManager({eventTarget:document});
  const bag=config.kind==='normal'
    ?new QuestionBag(()=>stageQuestions(config.factor,config.mode))
    :new QuestionBag(()=>bossQuestions(config.min,config.max));
  battle={config,input,score,combo,bag,playerHp:config.playerMaxHp,enemyHp:config.enemyMaxHp,current:null,wrongKeys:new Set(),asked:0,wrongStreak:0,locked:false,ended:false,startedAt:Date.now(),timer:null};
  battle.timer=new CountdownTimer(config.time,{eventTarget,onTick:(remaining)=>$('#battle-time').textContent=remaining,warningAt:[10]});
  eventTarget.addEventListener(EDU_EVENTS.TIMEUP,()=>finishBattle(false,'time'));
  setImage($('#battle-player'),CHARACTERS[state.selectedCharacter].stand);
  setImage($('#battle-enemy'),config.monster.image);
  $('#battle-enemy-name').textContent=config.monster.name;
  $('#battle-field').style.backgroundImage=`linear-gradient(rgba(235,245,240,.12),rgba(25,50,74,.12)),url("${config.background}")`;
  setupKeypad($('#battle-keypad'),input,submitBattleAnswer,()=>{});
  updateBattleHud(); nextBattleQuestion(); show('battle'); battle.timer.start();
}

function nextBattleQuestion(){
  if(!battle || battle.ended) return;
  battle.current=battle.bag.next(); battle.asked+=1; battle.wrongStreak=0; battle.input.value='';
  renderQuestion('battle',battle.current);
  $('#battle-answer').value=''; $('#battle-answer').placeholder='？'; $('#battle-answer').classList.remove('answer-hint'); $('#battle-feedback').textContent='';
  $('#battle-answer').focus({preventScroll:true});
  $('#battle-progress').textContent=`${battle.asked}問目｜あと${battle.enemyHp}回 正解で撃破`;
  battle.locked=false;
}

function updateBattleHud(){
  $('#player-hearts').textContent='♥'.repeat(battle.playerHp)+'♡'.repeat(battle.config.playerMaxHp-battle.playerHp);
  $('#enemy-hp-text').textContent=`${battle.enemyHp}/${battle.config.enemyMaxHp}`;
  $('#enemy-hp-bar').style.width=`${battle.enemyHp/battle.config.enemyMaxHp*100}%`;
  $('#combo-label').textContent=`${battle.combo.getCurrent()} COMBO`;
}

function swapPlayerPose(type,duration){
  const img=$('#battle-player'); const char=CHARACTERS[state.selectedCharacter];
  const src=type==='normal'?char.stand:char[type];
  setImage(img,src); img.classList.remove('pose-attack','pose-special','pose-damage');
  if(type!=='normal') img.classList.add(`pose-${type}`);
  if(type!=='normal') setTimeout(()=>{if(battle&&!battle.ended){setImage(img,char.stand);img.classList.remove(`pose-${type}`);}},duration);
}

function submitBattleAnswer(raw){
  if(!battle || battle.locked || battle.ended || String(raw).trim()==='') return;
  battle.locked=true;
  const q=battle.current; const ok=checker.check(raw,q.answer,{numeric:true,detail:{question:q,type:'multiplication'}});
  const stat=recordAttempt(state,q,ok); save();
  if(ok){
    battle.score.correct(); const combo=battle.combo.correct(); battle.enemyHp-=1;
    const pose=comboAnimation(combo); const delay=pose==='special'?1200:pose==='attack'?650:360;
    $('#battle-feedback').textContent=pose==='special'?`SPECIAL！ ${formatFormula(q)}`:pose==='attack'?`ATTACK！ ${formatFormula(q)}`:`正解！ ${formatFormula(q)}`;
    swapPlayerPose(pose,delay); const enemy=$('#battle-enemy'); enemy.classList.add('enemy-hit'); setTimeout(()=>enemy.classList.remove('enemy-hit'),300);
    playSound(pose==='special'?'combo10':pose==='attack'?'combo5':'correct'); updateBattleHud();
    if(battle.enemyHp<=0) setTimeout(()=>finishBattle(true,'defeat-enemy'),delay);
    else setTimeout(nextBattleQuestion,delay);
  }else{
    battle.score.wrong(); battle.combo.wrong(); battle.playerHp-=1; battle.wrongKeys.add(q.key); battle.wrongStreak+=1;
    if(battle.wrongStreak>=3){ battle.input.placeholder=String(q.answer); battle.input.classList.add('answer-hint'); $('#battle-feedback').textContent='答えがうっすら見えているよ。数字を入れてみよう！'; }
    else $('#battle-feedback').textContent='ちょっとちがうよ。もう一度！';
    swapPlayerPose('damage',650); playSound('wrong'); updateBattleHud();
    if(battle.playerHp<=0) setTimeout(()=>finishBattle(false,'hp'),550);
    else setTimeout(()=>{
      if(!battle || battle.ended || battle.current!==q) return;
      battle.input.value='';
      $('#battle-feedback').textContent='もう一度、考えてみよう！';
      battle.locked=false;
      battle.input.focus({preventScroll:true});
    },700);
  }
  if(stat.reviewActive) battle.wrongKeys.add(q.key);
}

function markBattleProgress(config,misses){
  let firstClear=false;
  if(config.kind==='normal'){
    const progress=state.stageProgress[config.factor][config.mode];
    firstClear=!progress.cleared; progress.cleared=true;
    if(misses===0) progress.noMiss=true;
    state.mastery[config.factor]=isMaster(state,config.factor);
  }else{
    firstClear=!state.bossProgress[config.bossId].defeated;
    state.bossProgress[config.bossId].defeated=true;
  }
  return firstClear;
}

function awardCollection(firstClear){
  // コレクションはランダム抽選にせず、初クリアごとに一覧の順で1つずつ集める。
  if(!firstClear) return null;
  const owned=new Set(state.collections);
  const item=COLLECTIONS.find((candidate)=>!owned.has(candidate.id));
  if(!item) return null;
  state.collections.push(item.id);
  return item;
}

function finishBattle(win,reason){
  if(!battle || battle.ended) return;
  battle.ended=true; battle.timer.pause();
  const elapsed=Math.max(1,Math.round((Date.now()-battle.startedAt)/1000));
  const result=battle.score.getResult(); const config=battle.config;
  const previousLevel=state.playerLevel;
  let firstClear=false; let reward=null; let earnedExp=0;
  if(win){
    firstClear=markBattleProgress(config,result.wrong);
    const base=config.kind==='normal'?20:config.bossId==='final'?100:50;
    const rawExp=base+Math.min(10,result.correct);
    earnedExp=config.kind==='normal'?getStageRewardExp(state,config.factor,rawExp):rawExp;
    addExp(state,earnedExp); reward=awardCollection(firstClear);
    const key=config.kind==='normal'?`${config.factor}-${config.mode}`:config.bossId;
    const category=config.support?'support':'normal';
    if(!state.bestTimes[category][key] || elapsed<state.bestTimes[category][key]) state.bestTimes[category][key]=elapsed;
    state.maxCombos[key]=Math.max(state.maxCombos[key]||0,battle.combo.getMax());
    state.monsterBook[config.monster.id]=true;
    state.monsterDefeatCounts[config.monster.id]=(state.monsterDefeatCounts[config.monster.id]||0)+1;
  }else { earnedExp=Math.min(5,result.correct); addExp(state,earnedExp); }
  save();
  if(state.playerLevel>previousLevel) playSound('levelup'); else if(reward) playSound(reward.rarity==='common'?'badge':'rareBadge'); else playSound(win?'allclear':'wrong');
  renderBattleResult({win,reason,elapsed,result,config,reward,firstClear,earnedExp,wrongKeys:[...battle.wrongKeys],remainingHp:battle.playerHp,maxCombo:battle.combo.getMax()});
  show('result');
}

function statChip(label,value){ return `<div class="stat-chip"><strong>${value}</strong><span>${label}</span></div>`; }
function actionButton(label,handler,primary=false){ const b=document.createElement('button');b.textContent=label;b.className=primary?'primary':'';b.addEventListener('click',handler);return b; }

function renderBattleResult(data){
  const {win,reason,result,elapsed,config,reward,firstClear,earnedExp,wrongKeys,remainingHp,maxCombo}=data;
  $('#result-mark').textContent=win?'🏆':'🌱'; $('#result-kicker').textContent='バトル終了';
  $('#result-title').textContent=win?'クリア！':reason==='time'?'タイムアップ':'あと少し！';
  $('#result-message').textContent=win?'モンスターを撃破！ 次の冒険か、苦手の特訓へ進もう。':'特訓すれば、次はきっと強くなれるよ。';
  $('#result-stats').innerHTML=statChip('正解',result.correct)+statChip('ミス',result.wrong)+statChip('最大コンボ',maxCombo)+statChip('クリア時間',formatTime(elapsed))+statChip('残りHP',remainingHp)+statChip('今回EXP',`+${earnedExp}`)+statChip('EXP累計',state.exp)+statChip('冒険レベル',`Lv.${state.playerLevel}`);
  const rewardBox=$('#result-reward'); rewardBox.hidden=!reward;
  if(reward) rewardBox.innerHTML=`<img src="${reward.image}" alt=""><div><strong>宝箱から「${reward.name}」！</strong><p>コレクションに追加されました。</p></div>`;
  const weak=$('#result-weak'); weak.hidden=!wrongKeys.length;
  if(wrongKeys.length) weak.innerHTML=`<strong>苦手として追加された九九</strong><div>${wrongKeys.map((key)=>`<button data-key="${key}">${formatFormula(parseKey(key))}</button>`).join('')}</div>`;
  const actions=$('#result-actions'); actions.innerHTML='';
  if(wrongKeys.length) actions.append(actionButton('まちがえた九九を特訓する',()=>startTraining('battle',null,wrongKeys,config),true));
  if(win){
    actions.append(actionButton('もう一度バトル！',()=>prepareBattle({...config})));
    actions.append(actionButton('ぼうけんマップへ',()=>show('adventure')));
  }else{
    actions.append(actionButton('もう一度',()=>prepareBattle({...config})));
    actions.append(actionButton('特訓する',()=>startTraining('battle',null,wrongKeys.length?wrongKeys:state.reviewQueue,config),!wrongKeys.length));
    if(!config.support) actions.append(actionButton('サポートONでもう一度',()=>{state.supportMode=true;save();prepareBattle({...config});}));
    actions.append(actionButton('マップへ',()=>show('adventure')));
  }
}

function renderTrainingMenu(){
  $('#training-menu').style.backgroundImage=`url("${BACKGROUNDS.training}")`;
  $('#training-menu').style.backgroundSize='cover';
  $('#training-menu').style.backgroundPosition='center';
  setImage($('#training-menu-player'),CHARACTERS[state.selectedCharacter].stand);
  if(state.trainingPartner===state.selectedCharacter) state.trainingPartner=Object.keys(CHARACTERS).find((key)=>key!==state.selectedCharacter);
  setImage($('#training-menu-partner'),CHARACTERS[state.trainingPartner].stand);
  $('#wrong-count').textContent=`未克服 ${state.reviewQueue.length}問`;
  const picker=$('#training-factor-picker'); picker.innerHTML='';
  FACTORS.forEach((factor)=>{const b=document.createElement('button');b.textContent=`${factor}の段`;b.addEventListener('click',()=>startTraining('stage',factor));picker.append(b);});
}

function startTraining(type,factor=null,preferredKeys=[],returnBattle=null){
  const seed=trainingSeed(state,type,factor,preferredKeys);
  const input=$('#training-answer');
  training={type,factor,preferredKeys,returnBattle,input,scheduler:new TrainingScheduler(seed),score:new ScoreManager(),locked:false,beforeQueue:new Set(state.reviewQueue)};
  $('#training').style.backgroundImage=`url("${BACKGROUNDS.training}")`;
  $('#training').style.backgroundSize='cover';
  $('#training').style.backgroundPosition='center';
  $('#training-title').textContent=type==='stage'?`${factor}の段 特訓`:type==='wrong'?'まちがい特訓':type==='battle'?'バトルのまちがい特訓':'おまかせ特訓';
  setImage($('#training-player'),CHARACTERS[state.selectedCharacter].stand);
  setImage($('#training-partner'),CHARACTERS[state.trainingPartner].stand);
  $('#partner-speech').textContent='いっしょにやろう！';
  setupKeypad($('#training-keypad'),input,submitTrainingAnswer,()=>{});
  show('training'); renderTrainingQuestion();
}

function renderTrainingQuestion(){
  const q=training.scheduler.current();
  if(!q){ finishTraining(); return; }
  training.input.value=''; training.locked=false;
  renderQuestion('training',q);
  $('#training-answer').value=''; $('#training-feedback').textContent='';
  $('#training-answer').focus({preventScroll:true});
  $('#training-remaining').textContent=training.scheduler.remaining();
}

function submitTrainingAnswer(raw){
  if(!training || training.locked || String(raw).trim()==='') return;
  training.locked=true; const q=training.scheduler.current();
  const ok=checker.check(raw,q.answer,{numeric:true,detail:{question:q,type:'training'}});
  const stat=recordAttempt(state,q,ok); ok?training.score.correct():training.score.wrong(); save();
  const message=pick(ENCOURAGEMENT[ok?'correct':'wrong']); $('#partner-speech').textContent=message;
  $('#training-feedback').textContent=ok?`正解！ ${formatFormula(q)}`:`${formatFormula(q)}　${message}`;
  playSound(ok?'correct':'wrong');
  const needsReview=stat.reviewActive;
  setTimeout(()=>{training.scheduler.advance(needsReview);renderTrainingQuestion();},ok?350:650);
}

function trainingExpAward(correct){
  const today=new Date().toISOString().slice(0,10);
  if(state.trainingExp.date!==today) state.trainingExp={date:today,earned:0};
  const wanted=Math.min(5,1+Math.floor(correct/3)); const allowed=Math.max(0,20-state.trainingExp.earned); const earned=Math.min(wanted,allowed);
  state.trainingExp.earned+=earned; addExp(state,earned); return earned;
}

function finishTraining(){
  const result=training.score.getResult(); const overcome=[...training.beforeQueue].filter((key)=>!state.reviewQueue.includes(key));
  const exp=trainingExpAward(result.correct); save();
  $('#result-mark').textContent='📖'; $('#result-kicker').textContent='特訓終了'; $('#result-title').textContent='特訓おつかれさま！';
  $('#result-message').textContent=overcome.length?`苦手を ${overcome.length}つ 克服！ 九九マップにも反映しました。`:'練習した記録が九九マップに反映されました。';
  $('#result-stats').innerHTML=statChip('正解',result.correct)+statChip('もう一度',result.wrong)+statChip('克服',overcome.length)+statChip('EXP',`+${exp}`);
  $('#result-reward').hidden=true; $('#result-weak').hidden=!state.reviewQueue.length;
  if(state.reviewQueue.length) $('#result-weak').innerHTML=`<strong>これからも練習する九九</strong><div>${recommendedKeys(state,5).map((key)=>`<button>${formatFormula(parseKey(key))}</button>`).join('')}</div>`;
  const actions=$('#result-actions'); actions.innerHTML='';
  if(training.returnBattle) actions.append(actionButton('もう一度バトル！',()=>prepareBattle({...training.returnBattle}),true));
  actions.append(actionButton('続けて特訓',()=>startTraining(training.type,training.factor,training.preferredKeys,training.returnBattle),!training.returnBattle));
  actions.append(actionButton('九九マップを見る',()=>show('map'))); actions.append(actionButton('ホームへ',()=>show('home')));
  playSound(overcome.length?'allclear':'correct'); show('result');
}

function renderMap(){
  const grid=$('#map-grid'); grid.innerHTML='';
  let clearedCount=0, masterCount=0;
  FACTORS.forEach((factor)=>{
    const s=factorSummary(state,factor),p=state.stageProgress[factor];
    const master=isMaster(state,factor);
    const stageCleared=Boolean(p.up.cleared&&p.down.cleared&&p.random.cleared);
    if(stageCleared) clearedCount++;
    if(master) masterCount++;
    const region=factor<=3?'草原エリア':factor<=6?'森エリア':'天空エリア';
    const card=document.createElement('button');
    card.type='button';
    card.className='map-card map-stage-card'+(master?' master':'');
    card.setAttribute('aria-label',factor+'の段。段をえらんで練習');
    const badge=master?'<span class="master-label">MASTER ✦</span>':stageCleared?'<span class="stage-cleared">CLEAR ✓</span>':'<span class="map-go" aria-hidden="true">→</span>';
    const gradeClass=s.mark==='◎'?'great':s.mark==='△'?'practice':'normal';
    const accuracy=s.attempts?s.accuracy+'%':'—';
    const recent=s.attempts?s.recentRate+'%':'—';
    card.innerHTML='<span class="map-region">'+region+'</span>'+
      '<span class="map-card-head"><span class="map-factor">'+factor+'<small>の段</small></span>'+badge+'</span>'+
      '<span class="map-progress" aria-label="クリア状況"><i class="'+(p.up.cleared?'done':'')+'" title="のぼり"></i><i class="'+(p.down.cleared?'done':'')+'" title="くだり"></i><i class="'+(p.random.cleared?'done':'')+'" title="ランダム"></i></span>'+
      '<span class="map-mode-labels"><span>のぼり</span><span>くだり</span><span>ランダム</span></span>'+
      '<span class="map-card-bottom"><span class="grade grade-'+gradeClass+'">'+s.mark+' '+s.label+'</span><span class="map-weak-count">'+(s.weakCount?'苦手 '+s.weakCount:'')+'</span></span>'+
      '<span class="map-card-stats"><span>正答率 <b>'+accuracy+'</b></span><span>最近 <b>'+recent+'</b></span></span>';
    card.addEventListener('click',()=>{currentFactor=factor;$('#mode-factor').textContent=factor;show('stage-modes');});
    grid.append(card);
  });
  $('#map-cleared-count').textContent=clearedCount+' / 9';
  $('#map-master-count').textContent=masterCount+'段';
  $('#map-weak-count').textContent=recommendedKeys(state,81).length+'問';
  const retainedCount=Object.values(state.multiplicationStats).filter((stat)=>Boolean(stat.retentionConfirmedAt) && !stat.reviewActive).length;
  $('#map-retained-count').textContent=retainedCount+' / 81';
  const keys=recommendedKeys(state,5),list=$('#recommend-list');
  list.innerHTML=keys.length?keys.map((key)=>'<button class="recommend-equation" data-train-key="'+key+'"><span>'+formatFormula(parseKey(key))+'</span><small>もう一度れんしゅう</small><b aria-hidden="true">→</b></button>').join(''):'<div class="recommend-empty"><strong>いまは特訓まちの九九はないよ！</strong><span>気になる段をえらんで、ランダムれんしゅうにちょうせんしよう。</span></div>';
  $('[data-train-key]',list).forEach((b)=>b.addEventListener('click',()=>startTraining('battle',null,[b.dataset.trainKey])));
  const board=$('#fact-board');
  if(board){
    board.innerHTML='';
    board.append(Object.assign(document.createElement('span'),{className:'fact-axis-corner',textContent:'×'}));
    FACTORS.forEach((b)=>board.append(Object.assign(document.createElement('span'),{className:'fact-axis',textContent:String(b)})));
    FACTORS.forEach((a)=>{
      board.append(Object.assign(document.createElement('span'),{className:'fact-axis fact-row-axis',textContent:String(a)}));
      FACTORS.forEach((b)=>{
        const key=`${a}x${b}`;
        const status=questionStatus(state,key);
        const cell=document.createElement('button');
        cell.type='button';
        cell.className=`fact-cell ${status}`;
        cell.textContent=String(a*b);
        const labels={'needs-review':'特訓',retained:'定着確認',recorded:'記録あり',unseen:'未挑戦'};
        cell.setAttribute('aria-label',`${a}かける${b}は${a*b}、${labels[status]}。タップして練習`);
        cell.title=`${a} × ${b} ＝ ${a*b}：${labels[status]}`;
        cell.addEventListener('click',()=>startTraining('battle',null,[key]));
        board.append(cell);
      });
    });
  }
}
function allMonsters(){ return [...NORMAL_MONSTERS,...Object.values(BOSS_CANDIDATES).flat()]; }
const STICKER_EFFECTS=['holo','rainbow','glitter','neon','aurora','prism'];
function stickerEffect(){return STICKER_EFFECTS[Math.floor(Math.random()*STICKER_EFFECTS.length)]}
function renderBook(){
  const grid=$('#book-grid');grid.innerHTML='';
  allMonsters().forEach((monster)=>{const got=state.monsterBook[monster.id],card=document.createElement('article');card.className='book-card'+(got?' sticker-monster-card effect-'+stickerEffect():'');card.innerHTML=`<img class="${got?'sticker-monster-image':'locked-image'}" src="${monster.image}" alt=""><strong>${got?monster.name:'？'}</strong><span>${got?`撃破 ${state.monsterDefeatCounts[monster.id]||0}回`:'まだ出会っていません'}</span>`;grid.append(card);});
}

function badgeSnapshot(){
  const byKey=state.multiplicationStats||{};
  const entries=Object.entries(byKey).filter(([,v])=>(v.attempts||0)>0);
  const stats=Object.values(byKey);
  const attempts=stats.reduce((sum,item)=>sum+(item.attempts||0),0);
  const correct=stats.reduce((sum,item)=>sum+(item.correct||0),0);
  const wrong=stats.reduce((sum,item)=>sum+(item.wrong||0),0);
  const retained=stats.filter((item)=>Boolean(item.retentionConfirmedAt)&&!item.reviewActive).length;
  const clearedModes=FACTORS.reduce((sum,factor)=>sum+['up','down','random'].filter((mode)=>state.stageProgress[factor]?.[mode]?.cleared).length,0);
  const noMissModes=FACTORS.reduce((sum,factor)=>sum+['up','down','random'].filter((mode)=>state.stageProgress[factor]?.[mode]?.noMiss).length,0);
  const masterCount=FACTORS.filter((factor)=>isMaster(state,factor)).length;
  const verifiedFactors=FACTORS.filter((factor)=>['up','down','random'].some((mode)=>state.stageProgress[factor]?.[mode]?.noMiss)).length;
  const bossCount=Object.values(state.bossProgress||{}).filter((boss)=>boss.defeated).length;
  const maxCombo=Math.max(0,...Object.values(state.maxCombos||{}));
  const distinct=entries.length;
  const distinctCorrect=entries.filter(([,v])=>(v.correct||0)>0).length;
  const recent=state.recentAttempts||[];
  const comebacks=recent.filter((item,index)=>!item.correct&&recent[index+1]?.correct).length;
  const bossIds=new Set(Object.values(BOSS_CANDIDATES).flat().map((item)=>item.id));
  const bossDefeats=Object.entries(state.monsterDefeatCounts||{}).reduce((sum,[id,n])=>sum+(bossIds.has(id)?n:0),0);
  const monsters=Object.values(state.monsterBook||{}).filter(Boolean).length;
  const allCorrect=distinct===81&&distinctCorrect===81;
  const accuracy=correct/Math.max(1,attempts);
  return {byKey,entries,stats,attempts,correct,wrong,retained,clearedModes,noMissModes,masterCount,verifiedFactors,bossCount,maxCombo,distinct,distinctCorrect,comebacks,bossDefeats,monsters,allCorrect,accuracy};
}

function badgeStatus(item, snap){
  const {byKey,entries,attempts,correct,wrong,retained,clearedModes,noMissModes,masterCount,verifiedFactors,bossCount,maxCombo,distinct,distinctCorrect,comebacks,bossDefeats,monsters,allCorrect,accuracy}=snap;
  const owned=state.collections.filter((id)=>COLLECTIONS.some((c)=>c.id===id)).length;
  const achieved={
    'first-step':attempts>=1,
    comeback:comebacks>=1,
    clear:clearedModes>=1,
    perfect:noMissModes>=1,
    accuracy:attempts>=20&&accuracy>=.9,
    combo:maxCombo>=5,
    'keep-going':attempts>=30,
    'hard-worker':attempts>=81,
    'level-up':state.playerLevel>=2,
    'review-master':retained>=1,
    breakthrough:retained>=3,
    'never-give-up':wrong>=1&&retained>=1,
    mastery:masterCount>=1,
    adventurer:bossCount>=1,
    'steady-progress':clearedModes>=9,
    champion:bossCount===3,
    explorer:distinct>=27,
    'facts-9':distinct>=9,
    'facts-54':distinct>=54,
    'facts-81':distinct>=81,
    'all-correct':allCorrect,
    'three-tables':masterCount>=3,
    'all-tables':masterCount>=9,
    'perfect-three':noMissModes>=3,
    'boss-repeat':bossDefeats>=5,
    'monster-10':monsters>=10,
    'monster-30':monsters>=30,
    'collection-5':owned>=5,
    'collection-all':owned>=COLLECTIONS.length,
    'retained-5':retained>=5,
    'retained-10':retained>=10,
    'accuracy-50':attempts>=50&&accuracy>=.9,
    'accuracy-100':attempts>=100&&accuracy>=.95,
    'combo-10':maxCombo>=10,
    'comeback-5':comebacks>=5,
    'mode-variety':FACTORS.every((factor)=>['up','down','random'].some((mode)=>state.stageProgress[factor]?.[mode]?.cleared)),
    'boss-all':bossDefeats>=10,
    'long-journey':attempts>=200,
    'first-retention':retained>=2
  };
  if(item.category==='math'){
    const id=item.id;
    const has=(key)=>Boolean(byKey[key]&&(byKey[key].correct||0)>0);
    const pairs=entries.filter(([key,v])=>{if(!(v.correct||0))return false;const [a,b]=key.split('x').map(Number);return a!==b&&has(b+'x'+a);}).length/2;
    const stage4=['up','down','random'].filter((mode)=>state.stageProgress[4]?.[mode]?.cleared).length;
    const mathEarned={
      'math-calculation':attempts>=10&&accuracy>=.85,
      'math-mental-math':correct>=27,
      'math-number-sense':distinct>=9,
      'math-number-line':clearedModes>=1,
      'math-fraction-sense':clearedModes>=3,
      'math-geometry':stage4>=3,
      'math-measurement':noMissModes>=3,
      'math-spatial-sense':masterCount>=1,
      'math-pattern':masterCount>=3,
      'math-relationship':pairs>=3,
      'math-strategy':clearedModes>=3,
      'math-verification':noMissModes>=1,
      'math-simplify':attempts>=9&&accuracy>=.75,
      'math-another-way':comebacks>=1,
      'math-classification':monsters>=5,
      'math-generalization':masterCount>=3,
      'math-logical-thinking':distinctCorrect>=27,
      'math-compare':distinct>=18,
      'math-math-discovery':distinct>=40,
      'math-evidence':noMissModes>=3,
      'math-explainer':correct>=27,
      'math-prediction':state.playerLevel>=3,
      'math-representation-link':distinct>=54,
      'math-reverse-thinking':pairs>=18,
      'math-visualize':stage4>=3
    };
    const progressMap={
      'math-calculation':[Math.min(attempts,10),10,'回答数'],
      'math-mental-math':[Math.min(correct,27),27,'正解数'],
      'math-number-sense':[Math.min(distinct,9),9,'異なる九九'],
      'math-number-line':[Math.min(clearedModes,1),1,'クリアモード'],
      'math-fraction-sense':[Math.min(clearedModes,3),3,'クリアモード'],
      'math-geometry':[stage4,3,'4の段のクリアモード'],
      'math-measurement':[Math.min(noMissModes,3),3,'ノーミスクリア'],
      'math-spatial-sense':[Math.min(masterCount,1),1,'MASTERの段'],
      'math-pattern':[Math.min(masterCount,3),3,'MASTERの段'],
      'math-relationship':[Math.min(pairs,3),3,'逆向きも正解した組'],
      'math-strategy':[Math.min(clearedModes,3),3,'クリアモード'],
      'math-verification':[Math.min(noMissModes,1),1,'ノーミスクリア'],
      'math-simplify':[Math.min(attempts,9),9,'回答数'],
      'math-another-way':[Math.min(comebacks,1),1,'立て直し'],
      'math-classification':[Math.min(monsters,5),5,'ナビアンの種類'],
      'math-generalization':[Math.min(masterCount,3),3,'MASTERの段'],
      'math-logical-thinking':[Math.min(distinctCorrect,27),27,'正解記録のある九九'],
      'math-compare':[Math.min(distinct,18),18,'異なる九九'],
      'math-math-discovery':[Math.min(distinct,40),40,'異なる九九'],
      'math-evidence':[Math.min(noMissModes,3),3,'ノーミスクリア'],
      'math-explainer':[Math.min(correct,27),27,'正解数'],
      'math-prediction':[Math.min(state.playerLevel,3),3,'レベル'],
      'math-representation-link':[Math.min(distinct,54),54,'異なる九九'],
      'math-reverse-thinking':[Math.min(pairs,18),18,'逆向きも正解した組'],
      'math-visualize':[stage4,3,'4の段のクリアモード']
    };
    const p=progressMap[id];
    const got=Boolean(mathEarned[id]);
    const accuracyNear=id==='math-calculation'?accuracy>=.75:id==='math-simplify'?accuracy>=.65:true;
    return {got,applicable:true,progress:p?p[0]+'/'+p[1]+' '+p[2]:'条件達成',near:!got&&p&&p[0]>=p[1]*.6&&accuracyNear};
  }
  const got=Boolean(achieved[item.id]);
  const targets={
    'first-step':[attempts,1,'回答'],'comeback':[comebacks,1,'立て直し'],'clear':[clearedModes,1,'クリアモード'],'perfect':[noMissModes,1,'ノーミスクリア'],
    accuracy:[Math.min(attempts,20),20,'回答数'],'combo':[maxCombo,5,'最大コンボ'],'keep-going':[attempts,30,'回答数'],'hard-worker':[attempts,81,'回答数'],
    'level-up':[state.playerLevel,2,'レベル'],'review-master':[retained,1,'定着した九九'],breakthrough:[retained,3,'定着した九九'],'never-give-up':[retained,1,'定着した九九'],
    mastery:[masterCount,1,'MASTERの段'],adventurer:[bossCount,1,'撃破したボス'],'steady-progress':[clearedModes,9,'クリアモード'],champion:[bossCount,3,'撃破したボス'],explorer:[distinct,27,'異なる九九'],
    'facts-9':[distinct,9,'異なる九九'],'facts-54':[distinct,54,'異なる九九'],'facts-81':[distinct,81,'異なる九九'],'all-correct':[distinctCorrect,81,'正解記録のある九九'],
    'three-tables':[masterCount,3,'MASTERの段'],'all-tables':[masterCount,9,'MASTERの段'],'perfect-three':[noMissModes,3,'ノーミスクリア'],
    'boss-repeat':[bossDefeats,5,'ボス撃破回数'],'monster-10':[monsters,10,'図鑑の種類'],'monster-30':[monsters,30,'図鑑の種類'],
    'collection-5':[owned,5,'集めた宝物'],'collection-all':[owned,COLLECTIONS.length,'集めた宝物'],'retained-5':[retained,5,'定着した九九'],'retained-10':[retained,10,'定着した九九'],
    'accuracy-50':[Math.min(attempts,50),50,'回答数'],'accuracy-100':[Math.min(attempts,100),100,'回答数'],'combo-10':[maxCombo,10,'最大コンボ'],
    'comeback-5':[comebacks,5,'立て直し'],'mode-variety':[FACTORS.filter((factor)=>['up','down','random'].some((mode)=>state.stageProgress[factor]?.[mode]?.cleared)).length,9,'クリアした段'],
    'boss-all':[bossDefeats,10,'ボス撃破回数'],'long-journey':[attempts,200,'回答数'],'first-retention':[retained,2,'定着した九九']
  };
  const p=targets[item.id];
  const value=p?Math.min(p[0],p[1]):0;
  const accuracyBadge=['accuracy','accuracy-50','accuracy-100'].includes(item.id);
  const progressText=p?value+'/'+p[1]+' '+p[2]+(accuracyBadge?'・正答率 '+Math.round(accuracy*100)+'%':''):'条件達成';
  const accuracyNear=!accuracyBadge||(item.id==='accuracy'?accuracy>=.8:item.id==='accuracy-50'?accuracy>=.8:accuracy>=.9);
  return {got,applicable:true,progress:progressText,near:!got&&p&&value>=p[1]*.6&&accuracyNear};
}

let badgeFilter='all';
function renderCollection(){
  const snap=badgeSnapshot();
  const badges=[...ACHIEVEMENT_BADGES,...MATH_BADGES];
  const earnedHistory=new Set(state.earnedBadges||[]);
  const statuses=new Map(badges.map((item)=>{const status=badgeStatus(item,snap);if(earnedHistory.has(item.id))status.got=true;return [item.id,status];}));
  const earned=badges.filter((item)=>statuses.get(item.id).got).length;
  $('#badge-count').textContent='獲得 '+earned+' / '+badges.length+' 個';
  const badgeGrid=$('#badge-grid'); badgeGrid.innerHTML='';
  badges.forEach((item)=>{
    const status=statuses.get(item.id);
    if(badgeFilter==='earned'&&!status.got) return;
    if(badgeFilter==='unearned'&&status.got) return;
    if(badgeFilter==='near'&&(!status.near||status.got)) return;
    const got=status.got,card=document.createElement('article');
    card.className='achievement-card'+(got?' earned':' locked')+(status.near?' near':'')+(status.applicable?'':' catalog-only');
    const label=got?'獲得済み':status.applicable?(status.near?'もう少し！':'まだ獲得していません'):'ほかの算数教材で活躍するバッジ';
    card.innerHTML='<img class="'+(got?'':'locked-image')+'" src="'+item.image+'" alt=""><strong>'+item.name+'</strong><span>'+label+'</span><small>'+(item.criteria||item.description||'')+'</small><small class="badge-progress">'+status.progress+'</small>';
    const img=card.querySelector('img'); img.onerror=()=>{img.hidden=true;}; badgeGrid.append(card);
  });
  const filterCount=$('#badge-filter-count');
  if(filterCount) filterCount.textContent=badgeFilter==='all'?'すべて表示':badgeFilter==='earned'?'獲得済みだけ':badgeFilter==='unearned'?'未獲得だけ':'もう少しで獲得';
  const owned=new Set(state.collections.filter((id)=>COLLECTIONS.some((item)=>item.id===id)));
  $('#collection-count').textContent='コレクション '+owned.size+' / '+COLLECTIONS.length+' 個';
  const grid=$('#collection-grid'); grid.innerHTML='';
  COLLECTIONS.forEach((item)=>{
    const got=owned.has(item.id),card=document.createElement('article');
    card.className='collection-card rarity-'+item.rarity+(got?' earned':' locked');
    card.innerHTML='<img class="'+(got?'':'locked-image')+'" src="'+item.image+'" alt=""><strong>'+(got?item.name:'？')+'</strong><span>'+(got?'集めたよ':'未獲得')+'</span>';
    const img=card.querySelector('img'); img.onerror=()=>{img.hidden=true;}; grid.append(card);
  });
}

function renderSettings(){
  $('#setting-sound').checked=!state.settings.muted;
  $('#setting-support').checked=state.supportMode;
  $('#setting-kuku-words').checked=state.settings.showKukuWords !== false;
}

$$('[data-badge-filter]').forEach((button)=>button.addEventListener('click',()=>{
  badgeFilter=button.dataset.badgeFilter;
  $$('[data-badge-filter]').forEach((item)=>{item.classList.toggle('selected',item===button);item.setAttribute('aria-pressed',String(item===button));});
  renderCollection();
}));

const homeContinue=$('#home-continue');
if(homeContinue) homeContinue.addEventListener('click',()=>show(homeContinue.dataset.target||'adventure'));
$$('[data-go]').forEach((button)=>button.addEventListener('click',()=>show(button.dataset.go)));
$$('[data-mode]').forEach((button)=>button.addEventListener('click',()=>prepareBattle({kind:'normal',factor:currentFactor,mode:button.dataset.mode})));
$$('[data-training]').forEach((button)=>button.addEventListener('click',()=>{
  const type=button.dataset.training;
  if(type==='stage') $('#training-factor-picker').hidden=!$('#training-factor-picker').hidden;
  else startTraining(type);
}));
$('#change-partner').addEventListener('click',()=>show('partner-select'));
$('#start-battle').addEventListener('click',startBattle);
$('#battle-exit').addEventListener('click',()=>{if(confirm('バトルをやめてマップへ戻りますか？')){battle?.timer.pause();battle=null;show('adventure');}});
$('#training-exit').addEventListener('click',()=>{if(confirm('特訓をやめてホームへ戻りますか？')){training=null;show('training-menu');}});
$('#setting-sound').addEventListener('change',(e)=>{state.settings.muted=!e.target.checked;save();if(e.target.checked)playSound('correct');});
$('#setting-support').addEventListener('change',(e)=>{state.supportMode=e.target.checked;save();});
$('#setting-kuku-words').addEventListener('change',(e)=>{state.settings.showKukuWords=e.target.checked;save();});
$('#prep-support').addEventListener('change',(e)=>{state.supportMode=e.target.checked;save();});

document.addEventListener('keydown',(event)=>{
  const current=screenManager.getCurrent(); const session=current==='battle'?battle:current==='training'?training:null;
  if(!session || session.locked) return;
  const input=current==='battle'?$('#battle-answer'):$('#training-answer');
  if(event.target?.classList?.contains('answer-input')){
    if(event.key==='Enter'){
      event.preventDefault();
      current==='battle'?submitBattleAnswer(input.value):submitTrainingAnswer(input.value);
    }
    return;
  }
  if(/^\d$/.test(event.key)){
    event.preventDefault();
    if(input.value.length<2) input.value+=event.key;
  }else if(event.key==='Backspace'){
    event.preventDefault();
    input.value=input.value.slice(0,-1);
  }else if(event.key==='Enter'){
    event.preventDefault();
    current==='battle'?submitBattleAnswer(input.value):submitTrainingAnswer(input.value);
  }
});

$$(".answer-input").forEach((input)=>{
  input.addEventListener('input',()=>{
    input.value=input.value.replace(/\D/g,'').slice(0,2);
  });
});

document.addEventListener(EDU_EVENTS.CORRECT,()=>{
  const node=screenManager.getCurrent()==='battle'?$('#battle-feedback'):$('#training-feedback');
  if(!node)return; node.classList.remove('effect-correct-pop'); void node.offsetWidth; node.classList.add('effect-correct-pop');
  setTimeout(()=>node.classList.remove('effect-correct-pop'),450);
});
document.addEventListener(EDU_EVENTS.WRONG,()=>{
  const node=screenManager.getCurrent()==='battle'?$('#battle-question'):$('#training-question');
  if(!node)return; node.classList.remove('effect-wrong-shake'); void node.offsetWidth; node.classList.add('effect-wrong-shake');
  setTimeout(()=>node.classList.remove('effect-wrong-shake'),450);
});

window.addEventListener('error',(event)=>{if(event.target instanceof HTMLImageElement)event.target.hidden=true;},true);
renderHome(); screenManager.show('home',{scroll:false});
enableFurigana();
