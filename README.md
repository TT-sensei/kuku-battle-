# 九九ファンタジーバトル

九九の習得・定着・弱点発見・再練習を、ファンタジー冒険として一続きにした小学生向けWeb教材です。

## 学習サイクル

`バトル → 誤答記録 → 九九マップ → 仲間と特訓 → 苦手克服 → 再バトル`

- 1〜9の段：のぼり・くだり・ランダム
- 中ボス1：2〜5の段、中ボス2：6〜9の段
- 大ボス：九九全81種類
- 特訓：HP・敵・タイマーなしの10問セット
- 1問単位の履歴、reviewQueue、2回連続正解による克服判定
- 九九マップ、MASTER、冒険Lv、図鑑、Fantasyコレクション
- 通常／サポート別の記録、ミュート、キーボード対応

## 技術構成

HTML / CSS / Vanilla JavaScript、GitHub Pages、`localStorage`のみで動作します。外部API・APIキー・DB・BGMは使用しません。

設計基盤は[edu-kit](https://github.com/TT-sensei/edu-kit)。ロジック部品は`edu-components`、UI演出は`edu-effects`、効果音は`sounds-recipe-`、報酬は`edu-assets`、キャラクターとモンスターは`navi-character-`の実在する軽量Web素材を参照しています。

## テスト

```bash
node tests.mjs
```

のぼり・くだり、ボス出題範囲、SPECIAL発動条件、誤答キューと間隔再出題、2回連続正解による克服、保存データ復元を確認します。
