// ============================================
// Node Extractor
// ノード抽出（構造更新）モジュール
// ============================================

import { llmClient } from '../llm/llm-client';

/**
 * ノード抽出結果
 */
export interface ExtractedNodes {
  nodes: Array<{ id: string; label: string; description?: string; reliability: 'low' | 'medium' | 'high' }>;
  edges: Array<{ from: string; to: string }>;
  contradictions: Array<{ source: string; target: string; reason: string }>;
}

/**
 * ノード抽出（構造更新）
 * 
 * 【責務】
 * 現在のコンテキストとユーザー入力に基づいて、構造を「更新」する。
 * - 既存ノードの維持、統合、または削除
 * - 新規ノードの追加
 * 
 * 【禁止事項】
 * - 最低数の強制禁止
 * - 重要度の判断禁止
 * - ノードの評価禁止
 * - 単純な連番IDの使用禁止 (n1, n2...)
 */
export async function extractNodes(
  userInput: string,
  intentResult: object,
  currentNodes: any[] = [],
  recentLogs: any[] = []
): Promise<ExtractedNodes> {
  const prompt = `
あなたは空間管理者です。現在の「思考の地図（ノード構造）」と、ユーザーからの新しい入力に基づいて、地図を更新せよ。

## 現在の構造 (Context)
${JSON.stringify(currentNodes)}

## 直近の会話/操作履歴 (History)
${JSON.stringify(recentLogs)}

## ユーザー入力 (New Input)
"${userInput}"

## 検出済み意図
${JSON.stringify(intentResult)}

## タスク: 構造の更新 (Structure Update)
1. **既存ノードの確認**: 入力に関連する既存ノードがあれば、それを維持または強化する。
2. **新規ノードの追加**: 新しい概念や視点があれば、新しいノードを作成する。
3. **矛盾・ギャップの検出**: ノード間の論理的な矛盾や、欠けている要素を特定する。

## ID生成ルール (Unique IDs)
- **既存ノード**: 必ず元のIDを維持すること。変更してはならない。
- **新規ノード**: 他と被らないユニークなIDを生成すること。
  - ❌ 禁止: "n1", "n2", "node1" (単純な連番は衝突するため禁止)
  - ✅ 推奨: "hash_<concept_name>", "node_<timestamp>_<random>"

## JSON形式で回答:
{
  "nodes": [
    { "id": "既存ID_または_新規ID", "label": "概念ラベル(必須・空文字禁止)", "description": "ノードの簡潔な説明(1-2文)", "reliability": "low|medium|high" }
  ],
  "edges": [{ "from": "id_a", "to": "id_b" }],
  "contradictions": [{ "source": "id_a", "target": "id_b", "reason": "矛盾理由" }]
}
`;
  try {
    const result = await llmClient.chatCompletionJson<ExtractedNodes>(
      [{ role: 'user', content: prompt }],
      0.5
    );
    
    // 空のラベルを持つノードを修正または除外
    result.nodes = result.nodes.map((n: any) => ({
      ...n,
      label: n.label || n.description || "不明な概念",
    })).filter((n: any) => n.label && n.label.trim() !== "");

    return result;
  } catch (error) {
    console.error('extractNodes error:', error);
    return { nodes: [], edges: [], contradictions: [] };
  }
}
