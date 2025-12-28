# 🎓 Adaptive Learning System (v2.1) - Adaptive Resource Projector

> **「思考停止を解除する装置」** - あなたの思考空間を投影し、自律的な探索を支援する "Space Manager"

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![AI Service](https://img.shields.io/badge/AI%20Service-Multi--Phase%20Pipeline-purple?style=flat-square)]()
[![Search](https://img.shields.io/badge/Web%20Search-DuckDuckGo-orange?style=flat-square)]()

---

## 📖 サービスの核心 (Core Philosophy)

このシステムは「先生」ではありません。**「空間管理者 (Space Manager)」**です。
学習者の「わからない」という状態（迷子状態）を、否定も肯定もせず、**「構造的な地図」**として外部に投影します。

### 🚫 Strict Constraints (3つの禁止原則)
システムは以下の行為を厳格に禁止されています（AIプロンプトレベルで制限）：
1.  **教えない (No Teaching)**: 正解や知識の直接的な提供を禁止。
2.  **評価しない (No Judging)**: 学習者の考えに対する良し悪しの判断を禁止。
3.  **推奨しない (No Recommending)**: 「おすすめ」や「重要」といったバイアスの提示を禁止。

### ✅ Projection Functions (投影機能)
代わりに、以下の3層の投影を行います：
-   **Layer 1 (Structural Map)**: あなたの思考と言葉をノード化し、矛盾や空白を可視化します。
-   **Layer 2 (Exploratory Interface)**: 「次にどのような判断軸があり得るか」を選択肢として展開します。
-   **Layer 3 (Code Sandbox)**: 思考が解決（RESOLVED）したとき、その理解をコードとして具現化します。

---

## 🛠️ アーキテクチャ (Technical Architecture)

本システムは、LLMの幻覚や過干渉を防ぐため、**「段階的LLM呼び出し (Phased LLM Pipeline)」**を採用しています。

### Phased Pipeline
1.  **Phase 1: Detect Intent** (意図検出)
    -   ユーザーの入力から「判断軸（ソート）」や「絞り込み（フィルタ）」の意図のみを抽出。
2.  **Phase 2: Extract Nodes** (構造抽出)
    -   入力テキストから概念ノードと、それらの間の「矛盾点」を抽出。
3.  **Phase 3: Generate Options** (選択肢生成)
    -   抽出された構造に基づき、問いかけ（軸ラベル）と選択肢を生成。
4.  **Phase 4: Web Search Integration** (RAG)
    -   **DuckDuckGo API** を使用して外部リソースをリアルタイムに検索し、構造にマッピング。

### Tech Stack
-   **Frontend**: Next.js (App Router), React, Tailwind CSS
-   **Backend Logic**: TypeScript (Strict Typed)
-   **AI**: OpenAI API Compatible Client (Testing with Ollama / OpenAI)
-   **Search**: DuckDuckGo Instant Answer API

---

## 🚀 クイックスタート

### 必要要件
-   Node.js 18.0 以上
-   OpenAI API Key または Local LLM (Ollama等)

### インストール

```bash
git clone <repository-url>
cd adaptive-learning/adaptive-learning-system
npm install
```

### 環境設定 (.env.local)

```env
# ローカルLLMを使用する場合 (推奨)
LOCAL_LLM_URL=http://localhost:11434/v1
LOCAL_LLM_MODEL=llama3

# OpenAI APIを使用する場合
OPENAI_API_KEY=your_api_key_here
```

### 起動

```bash
npm run dev
```

ブラウザで `http://localhost:3000` にアクセスしてください。

---

## 📚 ドキュメント

-   **設計思想**: [docs/docs-image/CONCEPT_NOTES.md](./docs/docs-image/CONCEPT_NOTES.md)
-   **プロンプト設計**: [docs/docs-image/prompt-template.md](./docs/docs-image/prompt-template.md)

---

*Verified Implementation v2.1 - Strict Projection Logic Enabled*
