// ============================================
// Structure Generation Service - Intervention Control
// Based on IMPLEMENTATION_SPECIFICATION.md Section V
// ============================================
//
// このファイルは後方互換性のために維持されています。
// 実装は src/lib/core/ に分割されました。
//
// 分割先:
// - core/lost-state-estimator.ts: DominantStrayStateEstimator
// - core/fact-analyzer.ts: StructuralFactAnalyzer
// - core/intervention-controller.ts: StrictInterventionController, CriticalInterventionController
// - core/output-controller.ts: determineOutputControl, OutputControl
// ============================================

// 互換性維持のため、すべてを core/ から再エクスポート
export { DominantStrayStateEstimator } from './core/lost-state-estimator';
export { StructuralFactAnalyzer } from './core/fact-analyzer';
export { 
  StrictInterventionController, 
  CriticalInterventionController 
} from './core/intervention-controller';
export { 
  determineOutputControl,
  type OutputControl 
} from './core/output-controller';
