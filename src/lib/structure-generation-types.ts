// ============================================
// Structure Generation Service - Core Types
// Based on CONCEPT_NOTES.md and IMPLEMENTATION_SPECIFICATION.md
// ============================================
//
// このファイルは後方互換性のために維持されています。
// 型定義は src/lib/types/ に分割されました。
// 
// 分割先:
// - domain-model.ts: StructureNode, LostState, OperatorLog等
// - external-resource.ts: ExternalResource, RawChunk, SearchQuery等
// - ui-types.ts: PanelState, NodeTreeItem, ChatMessage等
// - intervention-types.ts: InterventionPhase, FactPresentation等
// - support-payload.ts: SupportPayload, ProjectionMap等
// - index.ts: 全型の再エクスポート
// ============================================

// 互換性維持のため、すべての型を types/ から再エクスポート
export * from './types';
