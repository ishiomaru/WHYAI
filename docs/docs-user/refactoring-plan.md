# WHYAI リファクタリング実装計画書（完全版）

## 目次
1. [サービス概要](#1-サービス概要)
2. [現状のファイル構成と役割](#2-現状のファイル構成と役割)
3. [現状の処理フロー](#3-現状の処理フロー)
4. [expansion.mdの課題一覧](#4-expansionmdの課題一覧)
5. [議論した問題点と結論](#5-議論した問題点と結論)
6. [前提条件](#6-前提条件)
7. [実装フェーズ](#7-実装フェーズ)
8. [将来の検討事項](#8-将来の検討事項)

---

## 1. サービス概要

### WHYAIとは
**「適応型学習システム（Adaptive Learning System）」** - 「思考停止を解除する装置」

従来の「教える」学習支援ツールではなく、**「Space Manager（空間管理者）」**として機能するAI学習支援サービス。学習者の「わからない」状態を構造的な地図として投影し、自律的な探索を支援する。

### 3つの設計原則（CONCEPT_NOTES準拠・不変）
1. **教えない (No Teaching)** - 正解や知識の直接提供を禁止
2. **評価しない (No Judging)** - 良し悪しの判断を禁止
3. **推奨しない (No Recommending)** - おすすめやバイアスの提示を禁止

### 技術スタック
- **フレームワーク**: Next.js (App Router) + TypeScript
- **LLM**: OpenAI互換API（ローカルLLMエンドポイント対応）
- **外部検索**: DuckDuckGo API + Jina Reader
- **テスト**: Vitest (ユニット) + Playwright (E2E)
- **スタイル**: Tailwind CSS

---

## 2. 現状のファイル構成と役割

### 2.1 src/lib/ - コアロジック層（12ファイル）

| ファイル | 行数 | 役割 | 状態 |
|---|---|---|---|
| `ai-service.ts` | 561 | AIサービス本体。4段階パイプライン: detectIntent → extractNodes → generateOptions → generateSandboxCode | ⚠️ 肥大化 |
| `concept-compliant-types.ts` | 516 | 視点操作型の定義。O0-O5視点操作子、M0-M5迷子状態、グローバル禁止ルール | ✅ 修正済み |
| `structure-generation-types.ts` | 614 | コア型定義。StructureNode、ExternalResource、OperatorLog等 | ⚠️ 肥大化・混同 |
| `intervention-control-service.ts` | 517 | 迷子推定(DominantStrayStateEstimator) + 介入制御(StrictInterventionController) | ⚠️ 責務混在 |
| `learner-support-service.ts` | 147 | 学習者サポート統括。段階的LLM呼び出しの制御 | ✅ 稼働中 |
| `learning-structure-generator.ts` | 281 | 3層構造生成: Layer A/B/C | ✅ 稼働中 |
| `rag-control-service.ts` | 352 | 検索クエリ生成、非意味的チャンキング、CollectionGateController | ⚠️ 複雑 |
| `web-search-service.ts` | 163 | DuckDuckGo + Jina Reader | ✅ 稼働中 |
| `homeostatic-controller.ts` | 116 | Question/Projection決定。安定時は投影、不安定時は問い | ✅ 稼働中 |
| `semantic-bridge.ts` | 98 | IntentClassifier（意図分類）、ProjectionMapper | ⚠️ 役割薄い |
| `support-context-assembler.ts` | 38 | コンテキスト組立 | ✅ 稼働中 |
| `utils.ts` | 123 | ユーティリティ関数 | ✅ 完成 |

### 2.2 src/components/ - UI層（9ファイル）

| ファイル | 役割 |
|---|---|
| `layout/MainLayout.tsx` (564行) | 3パネルレイアウト。左(NodeTree)・中央(Content)・右(Chat) |
| `panels/ChatPanel.tsx` | チャット入力パネル |
| `panels/ContentPanel.tsx` | コンテンツ表示（Graph/Doc/Custom切替） |
| `panels/NodeTreePanel.tsx` | ノードツリー表示 |
| `content/NodeGraph.tsx` (438行) | 2Dノードグラフ。ズーム/パン対応 |
| `content/ChoiceUI.tsx` | 選択肢UI |
| `content/ProjectedDocView.tsx` | 投影ドキュメント表示 |
| `content/CustomPageView.tsx` | sandbox生成コード表示 |
| `ArticleProjector.tsx` | 記事投影 |

### 2.3 src/app/api/ - API層

| ファイル | 役割 |
|---|---|
| `structure-generation/route.ts` (330行) | メインAPIエンドポイント。POST: 学習構造生成 |

### 2.4 ファイル依存関係

```
structure-generation-types.ts
    ↑ 11ファイルがimport（中心的な型定義ファイル）
    ↓ concept-compliant-types.ts から一部型をimport

ai-service.ts
    ↑ 4ファイルがimport
    └→ semantic-bridge.ts
    └→ learner-support-service.ts
    └→ intervention-control-service.ts
    └→ support-context-assembler.ts
```

---

## 3. 現状の処理フロー

### 3.1 APIルートの処理（route.ts 実装ベース）

```
ユーザー入力「量子力学を学びたい」
    ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 1: Semantic Bridge (semantic-bridge.ts)                │
│   └→ IntentClassifier.analyze()                            │
│   └→ ai-service.classifyIntent() を呼び出し                │
│   └→ 意図を分類（DEEP_DIVE / BROAD_EXPLORATION / etc）      │
│   └→ ドリフト（迷い度合い）を計算                           │
└───────────────────────────┬─────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 2: 検索 (rag-control-service + web-search-service)     │
│   └→ generateSearchQuery(): 入力を単語分割してトークン化    │
│   └→ executeWebSearch(): DuckDuckGo検索 → Jina Reader      │
│   └→ 上位3件の記事本文をMarkdownで取得                      │
│   └→ ExternalResourceとしてチャンク分割                     │
└───────────────────────────┬─────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 3: 迷子状態推定 (intervention-control-service.ts)      │
│   └→ DominantStrayStateEstimator.estimate()                 │
│   └→ ログを見て「今M0〜M5のどれか」を推定                  │
│   └→ isCritical（臨界点）かどうかも判定                    │
└───────────────────────────┬─────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 4: Homeostatic Controller (homeostatic-controller.ts)  │
│   └→ integrateState(): 迷子推定 + 意図分類を統合            │
│   └→ decideAction(): 「投影」or「問い」を決定              │
│       - 安定してる → PROJECTION（地図を見せる）            │
│       - 不安定 → QUESTION（問いを投げる）                  │
└───────────────────────────┬─────────────────────────────────┘
                            ↓
          ┌─────────────────┴─────────────────┐
          ↓                                   ↓
   【PROJECTION】                       【QUESTION】
   learning-structure-generator         intervention-control-service
   → ノードを見せる                     → StrictInterventionController
   → リソースをチャンクに追加           → 問いを導出
          └─────────────────┬─────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 5: Learner Support Service (learner-support-service)   │
│   └→ LearnerSupportService.execute()                        │
│   └→ ai-service.tsを呼んで:                                │
│       - detectIntent(): 意図検出                           │
│       - extractNodes(): ノード抽出                         │
│       - generateOptions(): 選択肢生成                       │
│       - (RESOLVED時のみ) generateSandboxCode()              │
│   └→ SupportPayloadを構築                                  │
└───────────────────────────┬─────────────────────────────────┘
                            ↓
                    UIにレスポンス返す
```

### 3.2 設計書が定義するモジュール（structure-generation-core-architecture.md）

| 設計上のモジュール | 役割 | 現在のファイル |
|---|---|---|
| Semantic Bridge | ユーザー入力を「意図クラス」へ変換 | `semantic-bridge.ts` |
| Structural Fact Analyzer | ログから客観的事実を抽出（回数、変化量、パターン） | `intervention-control-service.ts`の一部 |
| Homeostatic Controller | 「介入すべきか、静観すべきか」を決定。Layer A/B/Cのスイッチング | `homeostatic-controller.ts` |
| Learner Support Service | 介入内容を具体的なコンテンツに変換 | `learner-support-service.ts` |

---

## 4. expansion.mdの課題一覧

### 4.1 修正済みの課題

| 課題 | 状態 |
|---|---|
| L22-24: 静的テンプレート問題（TRANSLATION_TEMPLATES） | ✅ 修正済み - QUESTION_SEMANTICS + LLM動的生成に変更 |
| L19-20: nodeDelta === 0 の閾値問題 | ✅ 修正済み - DELTA_THRESHOLD = 0.3 で閾値ベース判定 |
| L29-30: translateQuestionToLanguageのテンプレート問題 | ✅ 修正済み - LLMによる動的翻訳に変更 |

### 4.2 未修正の課題（優先度順）

#### 高優先度（構造・骨格の問題）
| 課題 | 内容 |
|---|---|
| コードの流れが分かりづらい | ファイル間の接続が複雑で、ロジックの流れが追いにくい |
| L32-67: structure-generation-types.ts関連 | 型定義の混同、禁止プロパティと投影情報の混同 |
| L26-27: sameOperatorRepeated >= 2 | 2回が適切かどうか要相談（定数化済み、値は要検討） |

#### 中優先度（機能不足・UI問題）
| 課題 | 内容 |
|---|---|
| L68-74: UI操作による意図検出 | 選択肢のソート・編集などのUI操作から意図を検出できない |
| L71-72: ノード/選択肢の編集機能 | ユーザーが投影されたノードや選択肢を編集・追加できない |
| L78: ノードグラフのタブ表示問題 | ノードグラフがタブに表示されていないのに横のツリーから見れる |
| L86-87: UI_TEXTSのQUESTIONS定義 | learning-structure-generator.tsのQUESTION_TEMPLATESが何か不明 |

#### 低優先度（改善・拡張）
| 課題 | 内容 |
|---|---|
| L3-4: オンボーディングフロー | 離脱率が高くなる恐れ |
| L9-10: 永続化層（DB/Redis） | ユーザーアカウント機能、履歴管理 |
| L6-7: DDGモックへのフォールバック | 何を意味しているログか解明 |
| L93-95: 不規則な入力対応 | 「こんにちは」に対する不適切な応答 |

---

## 5. 議論した問題点と結論

### 5.1 「ドリフト」について

**問題**: `semantic-bridge.ts`で計算される`drift`（0.0-1.0）とは何か？

**結論**: 
- 意図分類の後に意図が判明したら分かるようなもの
- **不要の可能性が高い**（迷子状態M0-M5で十分では？）
- ただし今回は機能変更しないので、ロジックはそのまま維持

### 5.2 「検索タイミング」について

**問題**: 意図分類の直後（Step 2）に毎回検索している

**議論**:
- 意図分類にはLLMを使うが、記事は不要
- 記事が必要なのは「投影」のタイミング
- 世の中のRAGサービスでも「意図分類 → 意図に応じて検索するか分岐」がベストプラクティス

**結論**:
- 検索タイミングの変更は**ロジック変更になるため今回はやらない**
- 将来の検討事項としてメモ

### 5.3 「記事取得」の目的

**問題**: 投影時に記事を取得する目的は何か？

**設計書の意図（CONCEPT_NOTES L730-748）**:
- 外部情報はchunk化される
- 選択肢生成時に、ノードに紐づけて表示
- ノードの詳細部分に記事の情報を表示

**現状の実装**:
- `[RESOURCE] res_xxx`のようなラベルが表示されるだけ
- 記事の中身は見えていない可能性

**結論**: 今回は機能変更しないが、表示改善は将来の検討事項

### 5.4 「意図理解」と「意図分類」の違い

**議論**:
- **意図理解**: ユーザーが何を言ってるか理解する（必須）
- **意図分類**: DEEP_DIVE/BROAD_EXPLORATION等に分ける（現状の実装）

**結論**:
- 意図を理解することは必要（相手の言っていることを理解するため）
- CONCEPT_NOTESにも意図判断の記述がある
- ただし、意図分類のロジック改善は今回はやらない

### 5.5 「投影」と「コンテンツ生成」の関係

**問題**: 別ステップとして分かれている意味があるか？

**議論**:
- ユーザーの入力も「投影」される（ノードになる）
- 記事も「投影」される（ノードになる）
- 結局どちらも「ノードやUIを生成する」= 同じこと

**結論**: 
- 概念的には統合できそうだが、今回は機能変更しないのでそのまま

---

## 6. 前提条件

### 6.1 不変条件

1. **CONCEPT_NOTES.mdは変更しない**（設計書は正）
2. **機能・ロジック・UIは変えない**（リファクタリングのみ）
3. **処理フロー**: 意図理解 → 迷子推定 → その後いろいろ

### 6.2 今回やること

- **コードの可読性向上**（ファイル分割、責務明確化）
- **型定義の整理**（structure-generation-types.tsの分割）
- **ドキュメントの更新**（docs-imageの一部修正、service-visualization.md更新）

### 6.3 今回やらないこと

- 検索タイミングの変更
- 意図分類ロジックの変更
- ドリフトの廃止
- 投影とコンテンツ生成の統合

---

## 7. 実装フェーズ

### Phase 1: 型ファイルの分割（低リスク）

`structure-generation-types.ts`（614行）を以下に分割:

```
src/lib/types/
├── index.ts                    # 全export（互換性維持）
├── domain-model.ts             # StructureNode, LostState, OperatorLog等
├── external-resource.ts        # ExternalResource, RawChunk, SearchQuery等
├── ui-types.ts                 # PanelState, NodeTreeItem, ChatMessage等
├── intervention-types.ts       # InterventionPhase, FactPresentation等
└── support-payload.ts          # SupportPayload, ProjectionMap等
```

**ポイント**:
- `index.ts`で全型を再exportすることで、既存のimport文はそのまま動く
- 段階的に移行可能

### Phase 2: ロジック層の責務明確化（中リスク）

#### 2-1. intervention-control-service.tsの整理

現在:
- DominantStrayStateEstimator（迷子推定）
- StructuralFactAnalyzer（事実分析）
- StrictInterventionController（介入制御）
- CriticalInterventionController（臨界点対応）

→ 責務が多すぎるため、将来的に分割を検討

#### 2-2. semantic-bridge.tsの役割確認

現在:
- IntentClassifier → ai-serviceを呼ぶだけ
- ProjectionMapper → リソースをノードに変換

→ 役割が薄いが、今回は変更しない

### Phase 3: ドキュメント更新

#### docs-imageの修正候補
| ファイル | 修正内容 |
|---|---|
| `SYSTEM_EXTENSIONS.md` L28 | Wikipedia APIは現在未使用 |
| `UI_SPECIFICATION.md` | ノードグラフのタブ表示問題の反映 |

#### docs-user/service-visualization.mdの更新
- リファクタリング後のファイル構成を反映

---

## 8. 将来の検討事項

### 8.1 検索タイミングの最適化

現状は毎回検索しているが、意図に応じて分岐すべき:
- `UNCLEAR`のとき → 検索しない、問いで明確化
- `DEEP_DIVE`のとき → 検索して情報を投影

### 8.2 ドリフトの必要性検討

迷子状態（M0-M5）で十分な可能性。ドリフトは廃止を検討。

### 8.3 意図分類カテゴリの見直し

現状のカテゴリ（DEEP_DIVE, BROAD_EXPLORATION, SPECIFIC_NEED, UNCLEAR）がIT学習に偏っている可能性。

### 8.4 記事投影の表示改善

現状は`[RESOURCE] res_xxx`のラベルのみ。記事の中身を見せる設計のはずだが、実装が追いついていない可能性。

### 8.5 UI操作による意図検出

選択肢のソート・編集などのUI操作から意図を検出する機能がない。

---

## 検証方法

```powershell
# ユニットテスト
npm run test

# 型チェック
npx tsc --noEmit

# 開発サーバー起動
npm run dev

# E2Eテスト
npx playwright test
```

---

## 関連ドキュメント

- `docs/docs-image/CONCEPT_NOTES.md` - コア設計書（不変）
- `docs/docs-image/structure-generation-core-architecture.md` - 中核アーキテクチャ
- `docs/docs-image/GUIDE.md` - 実装ガイド
- `docs/docs-image/UI_SPECIFICATION.md` - UI仕様書
- `docs/docs-image/prompt-template.md` - プロンプトテンプレート
- `docs/docs-image/SYSTEM_EXTENSIONS.md` - システム拡張機能仕様
- `docs/docs-user/expansion.md` - 課題一覧
- `docs/docs-user/service-visualization.md` - サービス可視化
