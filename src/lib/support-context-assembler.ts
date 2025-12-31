import { 
  OperatorLogEntry, 
  LostState, 
  StructuralFact,
  StructureNode 
} from './structure-generation-types';
// AIService import removed - was unused

export interface SupportContext {
  readonly currentSpace: readonly StructureNode[];
  readonly recentLogs: readonly OperatorLogEntry[];
  readonly lostState: LostState;
  readonly structuralFact: StructuralFact;
  /** 学習者の入力（目的α） */
  readonly purposeAlpha: string;
}

export class SupportContextAssembler {
  static assemble(
    nodes: readonly StructureNode[], 
    logs: readonly OperatorLogEntry[], 
    state: LostState,
    fact: StructuralFact,
    purposeAlpha: string
  ): SupportContext {
    // 過去5件のログに絞る等のフィルタリングを行う
    const recentLogs = logs.slice(-5);
    
    return {
      currentSpace: nodes,
      recentLogs: recentLogs,
      lostState: state,
      structuralFact: fact,
      purposeAlpha
    };
  }
}
