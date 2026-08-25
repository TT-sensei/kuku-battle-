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

const MON=`${NAVI}/monsters`;
export const NORMAL_MONSTERS=[
  ['forest-puru','もりのプルン',`${MON}/zako/forest-puru.webp`],
  ['acorn-leafy','どんぐりリーフィ',`${MON}/zako/acorn-leafy.webp`],
  ['little-bat','こもりん',`${MON}/zako/komorin-little-night-bat.webp`],
  ['pebble-golem','ころゴーレム',`${MON}/zako/koro-golem-pebble-golem.webp`],
  ['ember-newt','ひのこイモリ',`${MON}/zako/hinoko-ember-newt.webp`],
  ['frost-pup','モフウルフ',`${MON}/zako/mofu-wolf-frost-pup.webp`],
  ['apple-mushroom','りんごキノコ',`${MON}/zako/kinoko-apple-mushroom.webp`],
  ['snow-puff','ゆきまる',`${MON}/zako/yukimaru-snow-puff.webp`],
  ['star-bat','スターコウモリ',`${MON}/zako/star-bat.webp`]
].map(([id,name,image],i)=>({id,name,image,kind:'normal',factor:i+1}));

export const BOSSES={
  mid1:{id:'forest-horn-king',name:'森角王グランリーフ',image:`${MON}/boss/forest-horn-king.webp`,kind:'midboss'},
  mid2:{id:'thunder-griffon',name:'雷翼グリフォン',image:`${MON}/boss/thunder-griffon.webp`,kind:'midboss'},
  final:{id:'crimson-inferno-dragon',name:'紅炎竜インフェルノ',image:`${MON}/boss/crimson-inferno-dragon.webp`,kind:'boss'}
};

export const BACKGROUNDS={normal:`${NAVI}/backgrounds/grassland.webp`,mid1:`${NAVI}/backgrounds/forest.webp`,mid2:`${NAVI}/backgrounds/sky-island.webp`,final:`${NAVI}/backgrounds/volcano.webp`};

export const COLLECTIONS=[
  ['dragon','ドラゴン','common'],['fairy','フェアリー','common'],['golem','ゴーレム','common'],['griffin','グリフォン','common'],
  ['phoenix','フェニックス','common'],['slime','スライム','common'],['unicorn','ユニコーン','common'],['wizard-cat','まほうネコ','common'],
  ['kitsune-spirit','キツネの精霊','rare'],['mermaid','マーメイド','rare'],['pegasus','ペガサス','rare'],['treasure-mimic','ミミック','rare'],
  ['celestial-dragon','天空竜','super-rare'],['moon-unicorn','月のユニコーン','super-rare'],['ancient-guardian','古代の守護者','secret']
].map(([id,name,rarity])=>({id,name,rarity,image:`${ASSETS}/${rarity}/${id}/badge.webp`}));

export const ENCOURAGEMENT={
  correct:['いいね！','そのちょうし！','ばっちり！','できてるよ！'],
  wrong:['ここをもう一回！','いっしょに覚えよう！','次はできそう！','もう一度やってみよう！']
};
