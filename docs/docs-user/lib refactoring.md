# lib層リファクタリング計画（更新版）

## 完了済みの修正

### ✅ 静的テンプレート問題の修正

learning-structure-generator.tsから静的テンプレートを削除:
- UI_TEXTS.QUESTIONS → 削除
- QUESTION_TEMPLATES → 削除
- generateStructuralQuestion() → 削除

問いは常に動的生成を使用:
- StrictInterventionController.deriveIntervention() で意味構造決定
- ai-service.translateToNaturalLanguage() で自然言語翻訳
- generateLearningStructure(explicitQuestion)に渡す

---


## 議論で明確になった点

### 1. 設計用語と実装用語の不一致
|設計書の用語|現在の実装|問題|
|---|---|---|
|Layer A (構造空間)|チャンク変換|設計=概念、実装=データ変換|
|Layer B (動的/状態)|操作子定義|設計=概念、実装=UIボタン|
|Layer C (介入/問い)|問い表示|一致してる|

### 2. コアロジックと意図理解は分けるべき
現在:

- core/intent-analyzer.ts に意図理解を入れようとした
修正:

- 意図理解 = 入力処理（Step 1）
- コアロジック = 迷子推定→判定→介入（Step 2-4）
- 別の責務なので別フォルダにすべき

### 3. LLMクライアントの名前
現在: OpenAIのSDKを使ってるがLocal LLMに接続 修正: llm-client.ts のままでOK（内部実装は柔軟）

### 4. サポート系の再定義
現在: 「サポート」という曖昧な概念 実態: AI呼び出し以外の処理オーケストレーション

---

## 提案するファイル構成（修正版）

```
src/lib/
│
├── input/                     # 入力処理
│   └── intent-analyzer.ts     # 意図理解（旧 semantic-bridge + classifyIntent）
│
├── core/                      # コアロジック（処理フロー）
│   ├── lost-state-estimator.ts # 迷子推定（旧 intervention-control-service の一部）
│   ├── homeostatic-controller.ts # 投影/問い判定
│   └── intervention-controller.ts # 介入制御
│
├── generation/                # 生成系
│   ├── structure-generator.ts # Layer A/B/C生成（旧 learning-structure-generator）
│   ├── options-generator.ts   # 選択肢生成（旧 ai-service.generateOptions）
│   ├── sandbox-generator.ts   # sandbox生成（旧 ai-service.generateSandboxCode）
│   └── node-extractor.ts      # ノード抽出【要検討: 投影との関係】
│
├── external/                  # 外部連携
│   ├── web-search-service.ts  # Web検索
│   ├── search-query-builder.ts # クエリ生成
│   └── chunking-service.ts    # チャンキング
│
├── llm/                       # LLM呼び出し（Local/Cloud両対応）
│   └── llm-client.ts          # LLMクライアント
│
├── orchestration/             # 処理統括（旧 support）
│   ├── learner-support-service.ts # 処理オーケストレーター
│   └── context-assembler.ts   # コンテキスト組立
│
├── types/                     # 型定義（分割済み）
│
└── utils.ts                   # ユーティリティ
```

---

## 残りの論点

### 1. ノード抽出（node-extractor）の位置づけ
問題: ノード抽出は「投影」なのか「生成」なのか？
設計書的には:

- 「投影」= 学習者の認識を地図にする
- ノード抽出は「投影」の一部

選択肢:
- A: core/に入れる（投影の一部として）
- B: generation/に入れる（生成系として）
- C: 別の概念として再定義

### 2. Layer A/B/C の概念整理
問題: 設計用語と実装が合っていない
選択肢:
- A: 実装に合わせて設計書を更新
- B: 設計書に合わせて実装を更新
- C: 別の名前に変更

### 3. embedText()の削除
状況: ドリフト分析用だが、ドリフトはいらないという話だった

選択肢:
- A: 削除
- B: 将来のために残す

### 4. CollectionGateControllerの削除
状況: canCollect()以外使われていない
選択肢:
- A: 削除
- B: 必要になるまで残す

---

## 次のステップ
1. 残りの論点を相談して決める
2. ファイル分割を実行
3. 型チェック・テストで検証
4. ドキュメント更新