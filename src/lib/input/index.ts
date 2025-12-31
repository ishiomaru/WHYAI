// ============================================
// Input Module Index
// Re-exports all input processing components
// ============================================

export { 
  IntentAnalyzer, 
  IntentClassifier, // 後方互換性エイリアス
  type SemanticState, 
  type UserIntent 
} from './intent-analyzer';
export { ProjectionMapper } from './projection-mapper';
