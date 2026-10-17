const NAVI='https://tt-sensei.github.io/navi-character-/assets/web/fantasy';
const ASSETS='https://tt-sensei.github.io/edu-assets/assets/web/collections/fantasy';

export const CHARACTERS={
  sora:{role:'剣士',stand:`${NAVI}/sora-swordsman.webp`,attack:`${NAVI}/attack/sora-swordsman-attack.webp`,damage:`${NAVI}/damage/sora-swordsman-damage.webp`,special:`${NAVI}/special/sora-swordsman-special.webp`},
  riku:{role:'忍者',stand:`${NAVI}/riku-ninja.webp`,attack:`${NAVI}/attack/riku-ninja-attack.webp`,damage:`${NAVI}/damage/riku-ninja-damage.webp`,special:`${NAVI}/special/riku-ninja-special.webp`},
  kai:{role:'魔導士',stand:`${NAVI}/kai-mage.webp`,attack:`${NAVI}/attack/kai-mage-attack.webp`,damage:`${NAVI}/damage/kai-mage-damage.webp`,special:`${NAVI}/special/kai-mage-special.webp`},
  tsuki:{role:'アーチャー',stand:`${NAVI}/tsuki-archer.webp`,attack:`${NAVI}/attack/tsuki-archer-attack.webp`,damage:`${NAVI}/damage/tsuki-archer-damage.webp`,special:`${NAVI}/special/tsuki-archer-special.webp`},
  nami:{role:'騎士',stand:`${NAVI}/nami-guardian-knight.webp`,attack:`${NAVI}/attack/nami-knight-attack.webp`,damage:`${NAVI}/damage/nami-knight-damage.webp`,special:`${NAVI}/special/nami-knight-special.webp`},
  saku:{role:'ヒーラー',stand:`${NAVI}/saku-cleric-healer.webp`,attack:`${NAVI}/attack/saku-cleric-attack.webp`,damage:`${NAVI}/damage/saku-cleric-damage.webp`,special:`${NAVI}/special/saku-cleric-special.webp`}
};

const MON='https://tt-sensei.github.io/navi-character-/assets/web/fantasy/monsters';

// この九九サイトに出るモンスターは、NAVI Fantasyのモンスターグループ2で統一します。
// 下の3分割は九九の段ごとの出現ローテーションで、NAVIのグループ番号とは別のものです。
const GROUP2_ZAKO_BASE=[
  ['hinoko-ember-newt','ひのこイモリ'],
  ['koro-golem-pebble-golem','ころゴーレム'],
  ['yukimaru-snow-puff','ゆきまるスノーパフ'],
  ['forest-puru','森ぷる'],
  ['sand-ember-newt','サンドエンバーイモリ'],
  ['autumn-mushroom','オータムキノコ'],
  ['rainy-bat','雨ふりバット'],
  ['sunstone-golem','サンストーンゴーレム'],
  ['clover-mandragora','クローバーマンドラゴラ'],
  ['thunder-spark-fox','サンダースパークフォックス'],
  ['honeycomb-bee','ハニカムビー'],
  ['ember-lantern-salamander','エンバーランタン・サラマンダー'],
  ['puddle-mudling','みずたまりマドリン'],
  ['peach-puff-panda','ピーチパフパンダ'],
  ['stormhorn-kid','ストームホーンキッド'],
  ['ironleaf-panther','アイアンリーフパンサー'],
  ['duskblade-fox','ダスクブレードフォックス'],
  ['aurora-shell-lizard','オーロラシェルリザード'],
  ['hollow-hat-scarecrow','ホロウハットかかし'],
  ['shadow-puppet-cat','シャドウあやつりネコ'],
  ['cogwheel-beetle','コグホイール甲虫'],
  ['violet-reef-seahorse','ヴァイオレットリーフタツノオトシゴ'],
  ['rivet-bloom-beetle','リベットブルーム甲虫'],
].map(([id,name])=>({id,name,image:`${MON}/zako/${id}.webp`,kind:'normal'}));

const GROUP2_ZAKO_EVOLVED=[
  ['hinoko-ember-newt','ひのこイモリ'],
  ['koro-golem-pebble-golem','ころゴーレム'],
  ['yukimaru-snow-puff','ゆきまるスノーパフ'],
  ['forest-puru','森ぷる'],
  ['sand-ember-newt','サンドエンバーイモリ'],
  ['autumn-mushroom','オータムキノコ'],
  ['rainy-bat','雨ふりバット'],
  ['sunstone-golem','サンストーンゴーレム'],
  ['clover-mandragora','クローバーマンドラゴラ'],
  ['thunder-spark-fox','サンダースパークフォックス'],
  ['honeycomb-bee','ハニカムビー'],
  ['ember-lantern-salamander','エンバーランタン・サラマンダー'],
  ['puddle-mudling','みずたまりマドリン'],
  ['peach-puff-panda','ピーチパフパンダ'],
  ['stormhorn-kid','ストームホーンキッド'],
  ['ironleaf-panther','アイアンリーフパンサー'],
  ['duskblade-fox','ダスクブレードフォックス'],
  ['aurora-shell-lizard','オーロラシェルリザード'],
  ['hollow-hat-scarecrow','ホロウハットかかし'],
  ['shadow-puppet-cat','シャドウあやつりネコ'],
  ['cogwheel-beetle','コグホイール甲虫'],
  ['violet-reef-seahorse','ヴァイオレットリーフタツノオトシゴ'],
  ['rivet-bloom-beetle','リベットブルーム甲虫'],
].map(([id,name])=>({id:`${id}-evolved`,name:`${name}・エボル`,image:`${MON}/zako-evolved/${id}-evolved.webp`,kind:'normal'}));

export const NORMAL_MONSTERS=[...GROUP2_ZAKO_BASE,...GROUP2_ZAKO_EVOLVED]
  .map((monster,i)=>({...monster,factor:i+1}));

export const NORMAL_MONSTER_GROUPS=[0,1,2].map((groupIndex)=>
  NORMAL_MONSTERS.filter((_,index)=>index%3===groupIndex)
);

const GROUP2_BOSSES=[
  {id:'bakuretsu-boar',name:'ばくれつイノシシ（ボス）',image:`${MON}/boss/bakuretsu-boar.webp`,kind:'boss'},
  {id:'thunder-griffon',name:'サンダーグリフォン（ボス）',image:`${MON}/boss/thunder-griffon.webp`,kind:'boss'},
  {id:'berry-boar-king',name:'ベリーイノシシキング（ボス）',image:`${MON}/boss/berry-boar-king.webp`,kind:'boss'},
  {id:'solar-griffon-king',name:'太陽グリフォンキング（ボス）',image:`${MON}/boss/solar-griffon-king.webp`,kind:'boss'},
  {id:'dream-cat-mage',name:'夢見ネコメイジ',image:`${MON}/boss/dream-cat-mage.webp`,kind:'boss'},
  {id:'sky-ruin-griffon',name:'スカイ遺跡グリフォン（ボス）',image:`${MON}/boss/sky-ruin-griffon.webp`,kind:'boss'},
  {id:'flare-leo',name:'フレアレオ（ボス）',image:`${MON}/boss/flare-leo.webp`,kind:'boss'},
  {id:'frost-crystal-lion',name:'フロストクリスタルライオン',image:`${MON}/boss/frost-crystal-lion.webp`,kind:'boss'},
  {id:'coral-tide-serpent',name:'コーラルタイドサーペント（ボス）',image:`${MON}/boss/coral-tide-serpent.webp`,kind:'boss'},
  {id:'amber-dune-scarab',name:'アンバー砂丘スカラベ（ボス）',image:`${MON}/boss/amber-dune-scarab.webp`,kind:'boss'},
  {id:'abyssal-mirror-leviathan',name:'深海ミラーリヴァイアサン（ボス）',image:`${MON}/boss/abyssal-mirror-leviathan.webp`,kind:'boss'},
  {id:'obsidian-comet-wyvern',name:'黒曜コメットワイバーン（ボス）',image:`${MON}/boss/obsidian-comet-wyvern.webp`,kind:'boss'},
  {id:'magitech-gear-dragon',name:'マギテック・ギアドラゴン（ボス）',image:`${MON}/boss/magitech-gear-dragon.webp`,kind:'boss'},
];

export const BOSS_CANDIDATES={
  mid1:GROUP2_BOSSES.slice(0,4),
  mid2:GROUP2_BOSSES.slice(4,8),
  final:GROUP2_BOSSES.slice(8)
};

export const BOSSES=Object.fromEntries(
  Object.entries(BOSS_CANDIDATES).map(([id,candidates])=>[id,candidates[0]])
);

export const BACKGROUNDS={adventure:`${NAVI}/backgrounds/town.webp`,home:`${NAVI}/backgrounds/town.webp`,training:`${NAVI}/backgrounds/training-ground.webp`,normal:`${NAVI}/backgrounds/grassland.webp`,mid1:`${NAVI}/backgrounds/forest.webp`,mid2:`${NAVI}/backgrounds/sky-island.webp`,final:`${NAVI}/backgrounds/volcano.webp`};
export const PREP_GROUP_IMAGE=`${NAVI}/groups/group-fantasy-adventure.webp`;

export const COLLECTIONS=[
  ['dragon','ドラゴン','common'],['fairy','フェアリー','common'],['golem','ゴーレム','common'],['griffin','グリフォン','common'],
  ['phoenix','フェニックス','common'],['slime','スライム','common'],['unicorn','ユニコーン','common'],['wizard-cat','まほうネコ','common'],
  ['kitsune-spirit','キツネの精霊','rare'],['mermaid','マーメイド','rare'],['pegasus','ペガサス','rare'],['treasure-mimic','ミミック','rare'],
  ['celestial-dragon','天空竜','super-rare'],['moon-unicorn','月のユニコーン','super-rare'],['ancient-guardian','古代の守護者','secret']
].map(([id,name,rarity])=>({id,name,rarity,image:`${ASSETS}/${rarity}/${id}/badge.webp`}));

const MATH_ASSETS='https://tt-sensei.github.io/edu-assets/assets/web/badges/math';
export const MATH_BADGES=[
  ['calculation','計算マスター'],['mental-math','暗算マスター'],['number-sense','数感覚マスター'],
  ['number-line','数直線マスター'],['fraction-sense','分数感覚マスター'],['geometry','図形マスター'],
  ['measurement','量感マスター'],['spatial-sense','空間感覚マスター'],['pattern','きまり発見マスター'],
  ['relationship','関係発見マスター'],['strategy','作戦マスター'],['verification','確かめマスター'],
  ['simplify','すっきり整理マスター'],['another-way','別解発見マスター'],['classification','仲間分けマスター'],
  ['generalization','きまり説明マスター'],['logical-thinking','論理思考マスター'],['math-compare','比べ方マスター'],
  ['math-discovery','算数発見マスター'],['math-evidence','根拠説明マスター'],['math-explainer','算数説明マスター'],
  ['math-prediction','予想マスター'],['representation-link','表現つなぎマスター'],['reverse-thinking','逆思考マスター'],
  ['visualize','見える化マスター']
].map(([id,name])=>({id:`math-${id}`,name,rarity:'common',category:'math',image:`${MATH_ASSETS}/${id}/badge.webp`}));


// 学習の達成バッジは、実際の学習記録から条件達成を判定する。ランダム報酬にはしない。
const BADGE_ASSETS='https://tt-sensei.github.io/edu-assets/assets/web/badges/common';
export const ACHIEVEMENT_BADGES=[
  ['first-step','はじめの一歩','九九に初めて取り組んだ','1問以上の回答記録'],
  ['comeback','立て直し名人','まちがえたあとに立て直した','まちがいのあとに正解した'],
  ['clear','クリア','最初のステージクリア','段を1モード以上クリア'],
  ['perfect','パーフェクト','ミスなしでクリア','段をミスなしでクリア'],
  ['accuracy','正確無比','正確さが身についてきた','20回以上回答し、正答率90%以上'],
  ['combo','コンボ','連続正解でコンボ！','最大5コンボ以上'],
  ['keep-going','継続パワー','何度も練習した','回答記録30回以上'],
  ['hard-worker','努力家','コツコツ積み重ねた','回答記録81回以上'],
  ['level-up','レベルアップ','冒険レベルが上がった','レベル2以上'],
  ['review-master','ふくしゅう名人','苦手な九九が定着した','間を空けた再確認で1問以上定着'],
  ['breakthrough','にがて突破','苦手を乗り越えた','間を空けた再確認で3問以上定着'],
  ['never-give-up','あきらめない心','まちがい直しを続けた','まちがい記録と定着した九九がある'],
  ['mastery','マスター','1つの段をマスター','1つ以上の段がMASTER'],
  ['adventurer','ボスハンター','ボスに挑戦し撃破','ボスを1体以上撃破'],
  ['steady-progress','着実な歩み','いろいろな練習に挑戦','段のモードを9つ以上クリア'],
  ['champion','ボスチャンピオン','3体のボスをすべて撃破','中ボス2体と大ボスを撃破'],
  ['explorer','九九エクスプローラー','九九の世界を広く探検','異なる九九を27問以上記録'],
  ['facts-9','九九ビギナー','まずは9種類の九九に挑戦','異なる九九を9問以上記録'],
  ['facts-54','九九ハーフマスター','九九の半分以上に挑戦','異なる九九を54問以上記録'],
  ['facts-81','九九コンプリート探検家','九九81問すべてに挑戦','81種類すべての九九を記録'],
  ['all-correct','81問チャレンジャー','九九81問すべてに正解','81種類すべてで正解記録がある'],
  ['three-tables','三段クリア','3つの段をマスター','3つの段でMASTERを達成'],
  ['all-tables','九九の王者','9つの段をマスター','9つすべての段でMASTERを達成'],
  ['perfect-three','ノーミス名人','ミスなしクリアを積み重ねた','ノーミスで3モード以上クリア'],
  ['boss-repeat','ボス再挑戦の勇者','一度倒したボスにも再挑戦','ボス撃破数の合計が5回以上'],
  ['monster-10','図鑑ハンター','たくさんのナビアンに出会った','10種類以上のナビアンを撃破'],
  ['monster-30','図鑑コレクター','図鑑をさらに広げた','30種類以上のナビアンを撃破'],
  ['collection-5','宝物コレクター','宝物を5つ集めた','ファンタジーコレクション5個'],
  ['collection-all','伝説のコレクター','宝物をすべて集めた','ファンタジーコレクション15個'],
  ['retained-5','定着の達人','苦手だった九九を5問定着','間隔を空けた再確認で5問定着'],
  ['retained-10','苦手克服マスター','苦手だった九九を10問定着','間隔を空けた再確認で10問定着'],
  ['accuracy-50','正確さの積み重ね','正答率を保って50問','50回以上回答し、正答率90%以上'],
  ['accuracy-100','正確さの達人','正確な答えを100回積み重ねた','100回以上回答し、正答率95%以上'],
  ['combo-10','コンボの達人','10コンボを達成','最大10コンボ以上'],
  ['comeback-5','リカバリーの達人','まちがいのあとに5回立て直した','誤答後の正解が5回以上'],
  ['mode-variety','練習スタイルの探究者','いろいろな段・モードに挑戦','9段それぞれで1モード以上クリア'],
  ['boss-all','ボス完全制覇','3種類のボスをすべて撃破','中ボス2体と大ボスを撃破'],
  ['long-journey','冒険の積み重ね','200回回答に取り組んだ','回答記録200回以上'],
  ['first-retention','定着の第一歩','時間を空けて覚えたことを確認','間隔を空けた再確認で1問定着']
].map(([id,name,description,criteria])=>({id,name,description,criteria,rarity:'common',image:BADGE_ASSETS+'/'+id+'/badge.webp'}));

// コレクションはステージやボスの初クリア報酬。学びのバッジとは分けて表示する。
export const ALL_COLLECTIONS=COLLECTIONS;

export const ENCOURAGEMENT={
  correct:['いいね！','そのちょうし！','ばっちり！','できてるよ！'],
  wrong:['ここをもう一回！','いっしょに覚えよう！','次はできそう！','もう一度やってみよう！']
};
