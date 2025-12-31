// ============================================
// Semantic Bridge
// 数値的データと意味的意図の架け橋
// ============================================
//
// このファイルは後方互換性のために維持されています。
// 実装は src/lib/input/ に分割されました。
//
// 分割先:
// - input/intent-analyzer.ts: IntentClassifier (IntentAnalyzer)
// - input/projection-mapper.ts: ProjectionMapper
// ============================================

// 互換性維持のため、すべてを input/ から再エクスポート
export { 
  IntentClassifier, 
  IntentAnalyzer,
  type SemanticState, 
  type UserIntent 
} from './input/intent-analyzer';
export { ProjectionMapper } from './input/projection-mapper';

