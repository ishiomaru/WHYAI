---
description: サービス機能実装のためのプロンプトテンプレートを使用した実装ワークフロー
---

# 機能実装ワークフロー

このワークフローは、設計ドキュメントを参照して機能を実装する際の手順を定義します。

## 前提条件

- 実装対象の機能名が決定している
- 以下のドキュメントがプロジェクト内に存在する:
  - `docs/docs-image/CONCEPT_NOTES.md`
  - `docs/docs-image/structure-generation-core-architecture.md`
  - `docs/docs-image/IMPLEMENTATION_SPECIFICATION.md`
  - `docs/docs-image/IMPLEMENTATION_GUIDE.md`

## ワークフロー手順

### Step 1: プロンプトテンプレートの確認

1. `docs/docs-image/IMPLEMENTATION_PROMPT_TEMPLATE.md` を開く
2. テンプレート内の `【実装対象の機能名】` を実際の機能名に置き換える

### Step 2: フェーズ1 - 設計要件の抽出

1. `CONCEPT_NOTES.md` を参照
2. 以下の非機能要件を抽出:
   - 「思考の代行の禁止」への準拠方法
   - 「意味付けの禁止」への準拠方法
   - ロバスト性要件

### Step 3: フェーズ2 - 仕様の詳細化

1. `IMPLEMENTATION_SPECIFICATION.md` を参照
2. 入出力仕様を定義
3. 実装対象のクラス/関数を特定

### Step 4: フェーズ3 - コード生成

// turbo
1. `IMPLEMENTATION_GUIDE.md` のコード例を参考に実装
2. 禁止事項をコメントで明示
3. 型安全性を確保（frozen dataclass、NewType使用）

### Step 5: フェーズ4 - 検証

1. 自己レビュー実施（原則違反チェック）
2. 単体テストケースを3件作成
3. テスト実行

## 成果物

- 機能実装コード（Python / TypeScript）
- 単体テストコード
- 実装レポート（フェーズ1-4の記録）

## 関連ドキュメント

- [IMPLEMENTATION_PROMPT_TEMPLATE.md](../docs/docs-image/IMPLEMENTATION_PROMPT_TEMPLATE.md)
- [IMPLEMENTATION_GUIDE.md](../docs/docs-image/IMPLEMENTATION_GUIDE.md)
