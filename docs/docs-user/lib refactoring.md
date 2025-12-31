# lib層リファクタリング計画（完了）

## ステータス: ✅ 完了

リファクタリングは2024-12-31に完了しました。

---

## 完了した修正

### ✅ 静的テンプレート問題の修正

learning-structure-generator.tsから静的テンプレートを削除:
- UI_TEXTS.QUESTIONS → 削除
- QUESTION_TEMPLATES → 削除
- generateStructuralQuestion() → 削除

問いは常に動的生成を使用:
- StrictInterventionController.deriveIntervention() で意味構造決定
- ai-service.translateToNaturalLanguage() で自然言語翻訳
- generateLearningStructure(explicitQuestion)に渡す

### ✅ ファイル分割完了

| 元ファイル | 変更後 |
|-----------|--------|
| intervention-control-service.ts (517行) | 26行（core/からre-export） |
| semantic-bridge.ts (98行) | 22行（input/からre-export） |
| ai-service.ts (561行) | 125行（ファサードパターン） |
| route.ts (330行) | 152行（パイプライン委譲） |

---

## 最終ファイル構成

```
src/lib/
│
├── input/                     # 入力処理
│   ├── index.ts
│   ├── intent-analyzer.ts     # 意図理解
│   └── projection-mapper.ts   # リソース→ノード変換
│
├── core/                      # コアロジック
│   ├── index.ts
│   ├── lost-state-estimator.ts # M0-M5迷子推定
│   ├── fact-analyzer.ts       # 構造的事実分析
│   ├── intervention-controller.ts # 介入制御
│   └── output-controller.ts   # Layer A/B/C出力制御
│
├── generation/                # 生成系
│   ├── index.ts
│   ├── question-translator.ts # 問い翻訳
│   ├── options-generator.ts   # 選択肢生成
│   ├── node-extractor.ts      # ノード抽出
│   ├── sandbox-generator.ts   # sandbox生成
│   └── intent-detector.ts     # ソート/フィルタ意図検出
│
├── external/                  # 外部連携
│   ├── index.ts
│   └── web-search-service.ts  # Web検索
│
├── llm/                       # LLM呼び出し
│   ├── index.ts
│   └── llm-client.ts          # LLMクライアント
│
├── orchestration/             # 処理統括
│   ├── index.ts
│   └── pipeline.ts            # メイン処理パイプライン
│
├── types/                     # 型定義（既存・分割済み）
│
└── [既存ファイル]              # 後方互換性（re-export）
```

---

## 解決済みの論点

### 1. ノード抽出の位置づけ
**決定**: generation/に配置
理由: 純粋なLLM生成処理のため

### 2. Layer A/B/C の概念整理
**決定**: 実装優先で維持
設計書との乖離は将来的に検討

### 3. embedText()
**決定**: llm-client.tsに維持
将来のドリフト分析のために残す

### 4. CollectionGateController
**決定**: rag-control-service.tsに維持
canCollect()は現在も使用中

---

## 後方互換性

すべての既存import文はそのまま動作します:

```typescript
// 既存のimport（動作する）
import { DominantStrayStateEstimator } from '@/lib/intervention-control-service';
import { IntentClassifier } from '@/lib/semantic-bridge';

// 新しい推奨import
import { DominantStrayStateEstimator } from '@/lib/core';
import { IntentAnalyzer } from '@/lib/input';
```

---

## 検証結果

- ✅ TypeScript型チェック: Pass
- ✅ Next.js本番ビルド: Pass
- ✅ 後方互換性: 確認済み