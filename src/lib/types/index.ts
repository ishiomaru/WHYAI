// ============================================
// Structure Generation Types - Central Export
// 
// このファイルは全ての型を一元的にエクスポートします。
// 既存のインポート文との互換性を維持するため、
// 分割された各ファイルから型を再エクスポートしています。
// ============================================

// Domain Model Types
export type {
  NodeRole,
  StructureNode,
  OperatorIdType,
  AttemptType,
  StructuralDeltaType,
  OperatorLogEntry,
  SystemPhase,
  LostState,
  Confidence,
  LostStateEstimate,
} from './domain-model';

// Re-exported from concept-compliant-types via domain-model
export type {
  ViewpointOperationType,
  QuestionStructureType,
  ViewpointOperator,
  StructuralFact,
  QuestionSemantics,
} from './domain-model';

export { COLLECTION_ALLOWED_PHASES } from './domain-model';

// External Resource Types
export type {
  StructureForm,
  Granularity,
  RawChunk,
  StructureHint,
  SourceTrace,
  ExternalResource,
  ProjectionData,
  BreadthLevel,
  SearchQuery,
} from './external-resource';

// Intervention Types
export type {
  InterventionPhase,
  FactPresentation,
  StructuralConstraint,
  StructuralQuestionType,
  StructuralQuestion,
  CriticalInterventionSequence,
} from './intervention-types';

// UI Types
export type {
  UIOperatorType,
  UIOperator,
  ChunkData,
  StructurePresentation,
  OperabilityPresentation,
  LearningStructureOutput,
  NodeTreeType,
  NodeTreeItem,
  ChatMessage,
  ConversationIntent,
  SortIntent,
  FilterIntent,
  StructuralBehavior,
  DetectedIntent,
  ProjectedDocument,
  PanelState,
  ContentPanelMode,
  ContentTabType,
  SortFilterUIState,
} from './ui-types';

// Support Payload Types
export type {
  ProjectionNode,
  Contradiction,
  ProjectionMap,
  GeneratedOption,
  GeneratedOptions,
  SandboxCode,
  SupportPayload,
} from './support-payload';

// Utility Functions
export {
  createEmptyStructuralDelta,
  isStagnantDelta,
  canCollect,
} from './support-payload';
