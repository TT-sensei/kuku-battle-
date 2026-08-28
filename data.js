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

export const ALL_COLLECTIONS=[...COLLECTIONS,...MATH_BADGES];

export const ENCOURAGEMENT={
  correct:['いいね！','そのちょうし！','ばっちり！','できてるよ！'],
  wrong:['ここをもう一回！','いっしょに覚えよう！','次はできそう！','もう一度やってみよう！']
};
