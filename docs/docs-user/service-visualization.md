# 📁 WHYAI サービス概要
## サービスの正体
**「適応型学習システム (Adaptive Learning System)」** - 「思考停止を解除する装置」

これは従来の「教える」学習支援ツールではなく、**「Space Manager（空間管理者）」**として機能するAI学習支援サービスです。学習者の「わからない」状態を構造的な地図として投影し、自律的な探索を支援します。

---

# 📂 ファイル別役割まとめ
## src/lib/ - コアロジック層

| ファイル	|役割
|---|---
| ai-service.ts	|**AIサービス本体**。OpenAI互換クライアントを使用し、4段階パイプライン（意図検出→ノード抽出→選択肢生成→sandbox生成）を実装。「教えない・評価しない・推奨しない」の3禁止原則を厳守。
| concept-compliant-types.ts	|**視点操作型の定義**。問いを「生成」せず「設計」するための構造定義。視点操作子（O0-O5）と迷子状態（M0-M5）のマッピング。
| structure-generation-types.ts	|**型エントリーポイント**。types/から全型を再エクスポート。既存コードとの互換性を維持。
| intervention-control-service.ts	|**介入制御**。迷子状態推定器（DominantStrayStateEstimator）と厳格な介入コントローラー。学習者の「迷子パターン」を検出し適切な問いを導出。
| learner-support-service.ts	|**学習者サポート統括**。段階的LLM呼び出しの制御とsandbox生成条件チェック。思考の代行/意味付けを禁止。
| learning-structure-generator.ts	|**学習構造生成**。構造提示（事実のみ）、操作可能性提示、構造内在型問い生成の3層。禁止される操作（ハイライト・推奨等）は実装しない。
| rag-control-service.ts	|**RAG制御**。検索クエリ生成、非意味的チャンキング、収集ゲート管理。構造不安定時の収集を禁止。
| web-search-service.ts	|**Web検索統合**。DuckDuckGo APIで発見、Jina Readerでコンテンツ抽出。外部リソースを投影用に変換。
| homeostatic-controller.ts	|**ホメオスタシス制御**。学習の「呼吸」を調整。安定時は投影、不安定時は問いで介入。
| semantic-bridge.ts	|**意味的架け橋**。ユーザー意図の分類（DEEP_DIVE/BROAD_EXPLORATION等）と外部リソースから構造ノードへのマッピング。
| support-context-assembler.ts	|**サポートコンテキスト組立**。現在の構造空間、操作ログ、迷子状態をまとめてAIに渡す準備。
| utils.ts	|**ユーティリティ**。Tailwindクラス結合、ID生成、日時フォーマット等の汎用関数。

### src/lib/types/ - 型定義層

| ファイル	|役割
|---|---
| index.ts	|**型エクスポートのエントリーポイント**。全型を一元的に再エクスポート。
| domain-model.ts	|**コアドメインモデル**。StructureNode, LostState, OperatorLogEntry等の基礎型。
| external-resource.ts	|**外部リソース型**。ExternalResource, RawChunk, SearchQuery等のRAG関連型。
| ui-types.ts	|**UI型**。PanelState, NodeTreeItem, ChatMessage, LearningStructureOutput等のUI関連型。
| intervention-types.ts	|**介入型**。InterventionPhase, FactPresentation, StructuralQuestion等の介入制御関連型。
| support-payload.ts	|**サポートペイロード型**。SupportPayload, ProjectionMap等 + ユーティリティ関数。


---

## src/components/ - UI層

| ファイル	|役割
|---|---
| layout/MainLayout.tsx	|メインレイアウト（3パネル構成）
| panels/ChatPanel.tsx	|チャット入力パネル
| panels/ContentPanel.tsx	|コンテンツ表示パネル
| panels/NodeTreePanel.tsx	|ノードツリー表示パネル
| content/NodeGraph.tsx	|ノードグラフ可視化
| content/ChoiceUI.tsx	|選択肢UI
| content/ProjectedDocView.tsx	|投影ドキュメント表示
| content/CustomPageView.tsx	|カスタムページ表示
| ArticleProjector.tsx	|記事投影コンポーネント

---

## src/app/ - Next.js App Router

| ファイル	|役割
|---|---
| page.tsx	|メインページ
| layout.tsx	|ルートレイアウト
| globals.css	|グローバルスタイル
| api/	|APIエンドポイント

---

# 🎯 設計思想の核心
## 3つの禁止原則
1. 教えない (No Teaching) - 正解や知識の直接提供を禁止
2. 評価しない (No Judging) - 学習者の考えに良し悪しの判断を禁止
3. 推奨しない (No Recommending) - おすすめやバイアスの提示を禁止

## 3層の投影機能
- Layer 1: 思考と言葉をノード化し、矛盾や空白を可視化
- Layer 2: 次の判断軸の選択肢を展開
- Layer 3: 理解が解決（RESOLVED）したとき、コードとして具現化

## 段階的LLMパイプライン
幻覚や過干渉を防ぐため、LLMを単発ではなく4段階に分けて呼び出す設計です。

---

このサービスは、**学習者が自分で考える力を取り戻すための「認知的空間投影装置」**と言えます。