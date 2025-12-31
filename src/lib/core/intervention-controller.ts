// ============================================
// Intervention Controller
// 問いを生成（導出）する厳格なコントローラー
// Based on CONCEPT_NOTES.md O0-O5 operator definitions
// ============================================

import {
  LostStateEstimate,
  StructureNode,
  StructuralQuestion,
  CriticalInterventionSequence,
  FactPresentation,
  StructuralConstraint
} from '../types';
import {
  StructuralFact,
  deriveQuestionSemantics,
  VIEWPOINT_OPERATORS
} from '../concept-compliant-types';
import { StructuralFactAnalyzer } from './fact-analyzer';

// Forward declaration for aiService to avoid circular dependency
// Will be injected or imported lazily
let aiServiceModule: typeof import('../ai-service') | null = null;

async function getAiService() {
  if (!aiServiceModule) {
    aiServiceModule = await import('../ai-service');
  }
  return aiServiceModule.aiService;
}

/**
 * 厳格な介入コントローラー
 * 
 * 【Pipeline】
 * 1. Analyze Fact (from Logs)
 * 2. Select Operator (O0-O5)
 * 3. Derive Semantics (Logic)
 * 4. Translate (AI/Template)
 */
export class StrictInterventionController {
  
  /**
   * 問いを生成（導出）する
   */
  async deriveIntervention(
    estimate: LostStateEstimate,
    context: { purposeAlpha: string },
    currentNodes: readonly StructureNode[] = []
  ): Promise<StructuralQuestion> {
    
    // 1. Fact Analysis
    const logs = estimate.observationBasis as any[];
    const deltas = logs.map(l => l.structuralDelta);
    const fact = StructuralFactAnalyzer.analyze(logs, deltas, currentNodes);

    // 2. Select Operator
    const stateToOpMap: Record<string, string> = {
      'M0': 'O0', 'M1': 'O1', 'M2': 'O2', 
      'M3': 'O3', 'M4': 'O4', 'M5': 'O5',
      'RESOLVED': 'O0'
    };
    const opId = stateToOpMap[estimate.dominantState] || 'O0';
    const operator = VIEWPOINT_OPERATORS[opId];

    if (!operator) {
      throw new Error(`Unknown operator for state ${estimate.dominantState}`);
    }

    // 3. Derive Semantics
    const focusCandidate = currentNodes.length > 0 
      ? currentNodes[currentNodes.length - 1].label 
      : undefined;

    const semantics = deriveQuestionSemantics(fact, operator, {
      purposeAlpha: context.purposeAlpha,
      focusedNodeLabel: focusCandidate,
    });

    // 4. Translate
    const aiService = await getAiService();
    const content = await aiService.translateToNaturalLanguage(semantics);

    return {
      type: 'STRUCTURAL_QUESTION',
      questionType: semantics.questionType,
      content,
      semantics
    } as any;
  }
}

/**
 * 臨界点介入コントローラー
 * Retrofit for existing code compatibility
 */
export class CriticalInterventionController {
   private strictCtrl = new StrictInterventionController();

   async executeIntervention(
     estimate: LostStateEstimate,
     purposeAlpha: string,
     currentNodes: readonly StructureNode[] = []
   ): Promise<CriticalInterventionSequence> {
     // 事実と制約は固定（安全装置）
     const layerA: FactPresentation = { 
       type: 'FACT' as const, 
       content: '（構造的停滞が検出されました）' 
     };
     const layerB: StructuralConstraint = { 
       type: 'CONSTRAINT' as const, 
       content: '現在の視点では差分が生まれません。' 
     };
     
     // 問いを動的導出
     const layerC = await this.strictCtrl.deriveIntervention(
       estimate, 
       { purposeAlpha }, 
       currentNodes
     );

     return { layerA, layerB, layerC };
   }
}
