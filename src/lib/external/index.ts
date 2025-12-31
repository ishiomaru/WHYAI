// ============================================
// External Module Index
// Re-exports all external integration components
// ============================================

export { 
  executeWebSearch, 
  fetchAndCreateResource,
  checkSearchServiceHealth 
} from './web-search-service';

export {
  generateSearchQuery,
  chunkWithoutMeaning,
  createExternalResource,
  executeCollectionFlow,
  CollectionGateController,
  InvalidTransitionError
} from './rag-control-service';
