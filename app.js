import { EDU_EVENTS, StorageManager, ScreenManager, NumberInput, CountdownTimer, ScoreManager, ComboManager, AnswerChecker } from 'https://tt-sensei.github.io/edu-components/index.js';
import { soundList } from 'https://tt-sensei.github.io/sounds-recipe-/sounds.js';
import { CHARACTERS, NORMAL_MONSTERS, NORMAL_MONSTER_GROUPS, BOSS_CANDIDATES, BOSSES, BACKGROUNDS, ALL_COLLECTIONS, ENCOURAGEMENT } from './data.js';
import { FACTORS, MODES, QuestionBag, TrainingScheduler, addExp, getStageRewardExp, bossQuestions, comboAnimation, defaultState, factorSummary, isBossUnlocked, isMaster, migrateState, parseKey, question, recommendedKeys, recordAttempt, stageQuestions, trainingSeed } from './logic.js';

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
const BOSS_CONFIG={
  mid1:{title:'中ボス1・2〜5の段',hp:16,time:90,min:2,max:5,monster:BOSSES.mid1},
  mid2:{title:'中ボス2・6〜9の段',hp:16,time:90,min:6,max:9,monster:BOSSES.mid2},
  final:{title:'大ボス・1〜9すべて',hp:20,time:120,min:1,max:9,monster:BOSSES.final}
};

function save(){ storage.save('state',state); }
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
  $('#home').style.backgroundImage=`linear-gradient(rgba(255,253,248,.86),rgba(255,253,248,.88)),url("${BACKGROUNDS.home}")`;
  $('#home').style.backgroundSize='cover';
  $('#home').style.backgroundPosition='center';
  $('#home-level').textContent=state.playerLevel;
  $('#home-role').textContent=hero.role;
  setImage($('#home-character'),hero.stand);
  const count=state.reviewQueue.length;
  $('#home-review').textContent=count?`特訓おすすめが ${count}問 あります`:'苦手な九九はまだありません';
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
  const stages=$('#stage-grid'); stages.innerHTML='';
  FACTORS.forEach((factor)=>{
    const summary=factorSummary(state,factor);
    const button=document.createElement('button');
    button.className=`stage-card${isMaster(state,factor)?' master':''}`;
    button.innerHTML=`<strong>${factor}</strong><small>${isMaster(state,factor)?'MASTER 👑':`${summary.mark} ${summary.label}`}</small>`;
    button.addEventListener('click',()=>{currentFactor=factor;$('#mode-factor').textContent=factor;show('stage-modes');});
    stages.append(button);
  });
  const bosses=$('#boss-grid'); bosses.innerHTML='';
  Object.entries(BOSS_CONFIG).forEach(([id,config])=>{
    const unlocked=true;
    const hint=id==='mid1'?'2〜5の段のランダムをクリア':id==='mid2'?'6〜9の段のランダムをクリア':'中ボス2体を撃破';
    const button=document.createElement('button');
    button.className=`boss-card${unlocked?'':' locked'}`;
    button.innerHTML=`<img src="${config.monster.image}" alt=""><span><strong>${unlocked?config.title:'🔒 '+config.title}</strong><small>${unlocked?(state.bossProgress[id].defeated?'撃破済み・もう一度挑戦できるよ':'挑戦できるよ！'):`${hint}すると挑戦できるよ！`}</small></span>`;
    button.addEventListener('click',()=>unlocked && prepareBattle({kind:'boss',bossId:id}));
    bosses.append(button);
  });
}

function prepareBattle(config){
  pendingBattle={...config};
  const normal=config.kind==='normal';
  const monster=normal?normalMonsterForFactor(config.factor):BOSS_CONFIG[config.bossId].monster;
  const maxHp=normal?9:BOSS_CONFIG[config.bossId].hp;
  const baseTime=normal?60:BOSS_CONFIG[config.bossId].time;
  $('#prep-title').textContent=normal?`${config.factor}の段・${MODE_LABEL[config.mode]}`:BOSS_CONFIG[config.bossId].title;
  $('#prep-enemy-name').textContent=monster.name;
  $('#prep-rule').textContent=`HP ${maxHp}｜${baseTime}秒｜正解は必ず1ダメージ`;
  $('#prep-support').checked=state.supportMode;
  $('#support-detail').textContent=`HP7・時間${baseTime+(normal?30:config.bossId==='final'?40:30)}秒`;
  setImage($('#prep-player'),CHARACTERS[state.selectedCharacter].stand);
  setImage($('#prep-enemy'),monster.image);
  show('battle-prep');
}

function setupKeypad(container,input,onSubmit,onChange){
  container.innerHTML='';
  const keys=['1','2','3','4','5','6','7','8','9','delete','0','enter'];
  keys.forEach((key)=>{
    const button=document.createElement('button'); button.type='button'; button.dataset.key=key;
    button.textContent=key==='delete'?'×':key==='enter'?'決定':key;
    button.addEventListener('click',()=>{
      if(key==='enter') onSubmit(input.value);
      else { input.press(key); onChange(input.value); }
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
  const input=new NumberInput({answer:0},{eventTarget:document});
  const score=new ScoreManager();
  const combo=new ComboManager({eventTarget:document});
  const bag=config.kind==='normal'
    ?new QuestionBag(()=>stageQuestions(config.factor,config.mode))
    :new QuestionBag(()=>bossQuestions(config.min,config.max));
  battle={config,input,score,combo,bag,playerHp:config.playerMaxHp,enemyHp:config.enemyMaxHp,current:null,wrongKeys:new Set(),asked:0,locked:false,ended:false,startedAt:Date.now(),timer:null};
  battle.timer=new CountdownTimer(config.time,{eventTarget,onTick:(remaining)=>$('#battle-time').textContent=remaining,warningAt:[10]});
  eventTarget.addEventListener(EDU_EVENTS.TIMEUP,()=>finishBattle(false,'time'));
  setImage($('#battle-player'),CHARACTERS[state.selectedCharacter].stand);
  setImage($('#battle-enemy'),config.monster.image);
  $('#battle-enemy-name').textContent=config.monster.name;
  $('#battle-field').style.backgroundImage=`linear-gradient(rgba(235,245,240,.12),rgba(25,50,74,.12)),url("${config.background}")`;
  setupKeypad($('#battle-keypad'),input,submitBattleAnswer,(value)=>$('#battle-answer').textContent=value||'?');
  updateBattleHud(); nextBattleQuestion(); show('battle'); battle.timer.start();
}

function nextBattleQuestion(){
  if(!battle || battle.ended) return;
  battle.current=battle.bag.next(); battle.asked+=1; battle.input.reset({answer:battle.current.answer});
  $('#battle-question').firstChild.textContent=`${battle.current.factorA} × ${battle.current.factorB} ＝ `;
  $('#battle-answer').textContent='?'; $('#battle-feedback').textContent='';
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
    battle.score.wrong(); battle.combo.wrong(); battle.playerHp-=1; battle.wrongKeys.add(q.key);
    $('#battle-feedback').textContent=`${formatFormula(q)}　ここを特訓しよう！`;
    swapPlayerPose('damage',650); playSound('wrong'); updateBattleHud();
    if(battle.playerHp<=0) setTimeout(()=>finishBattle(false,'hp'),550);
    else setTimeout(nextBattleQuestion,700);
  }
  if(stat.reviewActive) battle.wrongKeys.add(q.key);
}

function markBattleProgress(config,misses){
  let firstClear=false;
  if(config.kind==='normal'){
    const progress=state.stageProgress[config.factor][config.mode];
    firstClear=!progress.cleared; progress.cleared=true;
    if(config.mode==='random' && misses===0) progress.noMiss=true;
    state.mastery[config.factor]=isMaster(state,config.factor);
  }else{
    firstClear=!state.bossProgress[config.bossId].defeated;
    state.bossProgress[config.bossId].defeated=true;
  }
  return firstClear;
}

function awardCollection(firstClear){
  const owned=new Set(state.collections);
  if(!firstClear && Math.random()>.45) return null;
  let candidates=ALL_COLLECTIONS.filter((item)=>!owned.has(item.id));
  if(firstClear){ const common=candidates.filter((item)=>item.rarity==='common'); if(common.length)candidates=common; }
  if(!candidates.length) return null;
  if(!firstClear){
    const roll=Math.random(); const rarity=roll<.7?'common':roll<.9?'rare':roll<.98?'super-rare':'secret';
    const same=candidates.filter((item)=>item.rarity===rarity); if(same.length)candidates=same;
  }
  const item=pick(candidates); state.collections.push(item.id); return item;
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
  const {win,reason,result,elapsed,config,reward,wrongKeys,remainingHp,maxCombo}=data;
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
  $('#training-menu').style.backgroundImage=`linear-gradient(rgba(239,249,241,.88),rgba(255,250,237,.9)),url("${BACKGROUNDS.training}")`;
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
  const input=new NumberInput({answer:0},{eventTarget:document});
  training={type,factor,preferredKeys,returnBattle,input,scheduler:new TrainingScheduler(seed),score:new ScoreManager(),locked:false,beforeQueue:new Set(state.reviewQueue)};
  $('#training').style.backgroundImage=`linear-gradient(rgba(239,249,241,.84),rgba(255,250,237,.88)),url("${BACKGROUNDS.training}")`;
  $('#training').style.backgroundSize='cover';
  $('#training').style.backgroundPosition='center';
  $('#training-title').textContent=type==='stage'?`${factor}の段 特訓`:type==='wrong'?'まちがい特訓':type==='battle'?'バトルのまちがい特訓':'おまかせ特訓';
  setImage($('#training-player'),CHARACTERS[state.selectedCharacter].stand);
  setImage($('#training-partner'),CHARACTERS[state.trainingPartner].stand);
  $('#partner-speech').textContent='いっしょにやろう！';
  setupKeypad($('#training-keypad'),input,submitTrainingAnswer,(value)=>$('#training-answer').textContent=value||'?');
  show('training'); renderTrainingQuestion();
}

function renderTrainingQuestion(){
  const q=training.scheduler.current();
  if(!q){ finishTraining(); return; }
  training.input.reset({answer:q.answer}); training.locked=false;
  $('#training-question').firstChild.textContent=`${q.factorA} × ${q.factorB} ＝ `;
  $('#training-answer').textContent='?'; $('#training-feedback').textContent='';
  $('#training-remaining').textContent=10-training.scheduler.index;
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
  $('#result-mark').textContent='📖'; $('#result-kicker').textContent='特訓終了'; $('#result-title').textContent='10問おつかれさま！';
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
  FACTORS.forEach((factor)=>{
    const s=factorSummary(state,factor),p=state.stageProgress[factor];
    const card=document.createElement('article'); card.className='map-card';
    card.innerHTML=`<div class="map-card-head"><h3>${factor}の段</h3>${isMaster(state,factor)?'<span class="master-label">MASTER 👑</span>':''}</div><div class="map-modes"><span class="${p.up.cleared?'done':''}">のぼり ${p.up.cleared?'✓':'－'}</span><span class="${p.down.cleared?'done':''}">くだり ${p.down.cleared?'✓':'－'}</span><span class="${p.random.cleared?'done':''}">ランダム ${p.random.cleared?'✓':'－'}</span></div><div class="map-metrics"><span><b>${s.accuracy}%</b>正答率</span><span><b>${s.recentRate}%</b>最近</span><span><b>${s.weakCount}</b>苦手</span></div><div class="grade">${s.mark} ${s.label}</div>`;
    grid.append(card);
  });
  const keys=recommendedKeys(state,5),list=$('#recommend-list');
  list.innerHTML=keys.length?keys.map((key)=>`<button data-train-key="${key}">${formatFormula(parseKey(key))}を特訓</button>`).join(''):'いまは特訓おすすめがありません。';
  $$('[data-train-key]',list).forEach((b)=>b.addEventListener('click',()=>startTraining('battle',null,[b.dataset.trainKey])));
}

function allMonsters(){ return [...NORMAL_MONSTERS,...Object.values(BOSS_CANDIDATES).flat()]; }
function renderBook(){
  const grid=$('#book-grid');grid.innerHTML='';
  allMonsters().forEach((monster)=>{const got=state.monsterBook[monster.id],card=document.createElement('article');card.className='book-card';card.innerHTML=`<img class="${got?'':'locked-image'}" src="${monster.image}" alt=""><strong>${got?monster.name:'？'}</strong><span>${got?`撃破 ${state.monsterDefeatCounts[monster.id]||0}回`:'まだ出会っていません'}</span>`;grid.append(card);});
}

function renderCollection(){
  const owned=new Set(state.collections); $('#collection-count').textContent=`${owned.size} / ${ALL_COLLECTIONS.length} 集まったよ`;
  const grid=$('#collection-grid');grid.innerHTML='';
  ALL_COLLECTIONS.forEach((item)=>{const got=owned.has(item.id),card=document.createElement('article');card.className=`collection-card rarity-${item.rarity}${got?'':' locked'}`;card.innerHTML=`<img class="${got?'':'locked-image'}" src="${item.image}" alt=""><strong>${got?item.name:'？'}</strong><span>${got?(item.category==='math'?'算数バッジ':item.rarity.toUpperCase().replace('-',' ')):'未獲得'}</span>`;grid.append(card);});
}

function renderSettings(){ $('#setting-sound').checked=!state.settings.muted; $('#setting-support').checked=state.supportMode; }

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
$('#prep-support').addEventListener('change',(e)=>{state.supportMode=e.target.checked;save();});

document.addEventListener('keydown',(event)=>{
  const current=screenManager.getCurrent(); const session=current==='battle'?battle:current==='training'?training:null;
  if(!session || session.locked) return;
  if(/^\d$/.test(event.key)){session.input.press(event.key);$(current==='battle'?'#battle-answer':'#training-answer').textContent=session.input.value||'?';}
  else if(event.key==='Backspace'){event.preventDefault();session.input.press('delete');$(current==='battle'?'#battle-answer':'#training-answer').textContent=session.input.value||'?';}
  else if(event.key==='Enter'){event.preventDefault();current==='battle'?submitBattleAnswer(session.input.value):submitTrainingAnswer(session.input.value);}
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
