// ============================================
// Learning Structure Generator Tests
// ============================================

// @ts-nocheck
import { describe, it, expect, vi } from 'vitest';
import {
  generateStructurePresentation,
  generateOperabilityPresentation,
  generateLearningStructure,
  reorderChunks,
  toggleChunkCollapse,
  groupChunks,
  ungroupChunks
} from '../generation';
import type { RawChunk, ChunkData } from '../structure-generation-types';

// ============================================
// Test Helpers
// ============================================

function createTestRawChunks(count: number): RawChunk[] {
  return Array(count).fill(null).map((_, i) => ({
    text: `Chunk content ${i + 1}`,
    length: 20,
    position: i * 500
  }));
}

function createTestChunkData(count: number): ChunkData[] {
  return Array(count).fill(null).map((_, i) => ({
    id: `chunk-${i}`,
    text: `Chunk content ${i + 1}`,
    collapsed: false,
    groupId: null
  }));
}

// ============================================
// 1. Structure Presentation Tests (Layer A)
// ============================================

describe('generateStructurePresentation', () => {
  it('チャンクがソース順で配置されること', () => {
    const rawChunks = createTestRawChunks(3);
    const presentation = generateStructurePresentation(rawChunks);
    
    expect(presentation.initialOrder).toBe('source_order');
    expect(presentation.chunks.length).toBe(3);
  });

  it('チャンクに禁止プロパティが含まれないこと', () => {
    const rawChunks = createTestRawChunks(2);
    const presentation = generateStructurePresentation(rawChunks);
    
    presentation.chunks.forEach(chunk => {
      expect(chunk).toHaveProperty('id');
      expect(chunk).toHaveProperty('text');
      expect(chunk).toHaveProperty('collapsed');
      expect(chunk).toHaveProperty('groupId');
      
      // 禁止プロパティ
      expect(chunk).not.toHaveProperty('highlighted');
      expect(chunk).not.toHaveProperty('important');
      expect(chunk).not.toHaveProperty('recommended');
      expect(chunk).not.toHaveProperty('priority');
    });
  });

  it('初期状態で全て展開されていること', () => {
    const rawChunks = createTestRawChunks(3);
    const presentation = generateStructurePresentation(rawChunks);
    
    presentation.chunks.forEach(chunk => {
      expect(chunk.collapsed).toBe(false);
    });
  });
});

// ============================================
// 2. Operability Presentation Tests (Layer B)
// ============================================

describe('generateOperabilityPresentation', () => {
  it('チャンク数に応じて操作子が調整されること', () => {
    // 少ないチャンク
    const presentation2 = generateOperabilityPresentation(2);
    expect(presentation2.availableOperators.length).toBe(2); // REORDER + TIMELINE
    
    // 多いチャンク
    const presentation6 = generateOperabilityPresentation(6);
    expect(presentation6.availableOperators.length).toBe(4); // 全操作子
  });

  it('禁止される操作子が含まれないこと', () => {
    const presentation = generateOperabilityPresentation(10);
    
    const operatorTypes = presentation.availableOperators.map(op => op.type);
    
    // 許可される操作子
    expect(operatorTypes).toContain('REORDER');
    expect(operatorTypes).toContain('COLLAPSE');
    expect(operatorTypes).toContain('GROUP');
    expect(operatorTypes).toContain('TIMELINE');
    
    // 禁止される操作子（存在しないことを確認）
    expect(operatorTypes).not.toContain('HIGHLIGHT');
    expect(operatorTypes).not.toContain('RECOMMEND');
    expect(operatorTypes).not.toContain('PRIORITIZE');
  });
});

// ============================================
// 3. Structural Question Tests (Layer C)
// ============================================
// Note: generateStructuralQuestion was removed.
// Questions are now generated dynamically via StrictInterventionController.deriveIntervention()
// and ai-service.translateToNaturalLanguage()


// ============================================
// 4. Learning Structure Output Tests
// ============================================

describe('generateLearningStructure', () => {
  it('全レイヤーが生成されること', () => {
    const rawChunks = createTestRawChunks(5);
    const output = generateLearningStructure(rawChunks);
    
    expect(output.layerA).toBeDefined();
    expect(output.layerB).toBeDefined();
  });

  it('臨界点でLayer Cが含まれること', () => {
    const rawChunks = createTestRawChunks(3);
    const criticalState = {
      dominantState: 'M1' as const,
      confidence: 'HIGH' as const,
      isCritical: true,
      observationBasis: []
    };
    
    const output = generateLearningStructure(rawChunks, criticalState);
    
    expect(output.layerC).toBeDefined();
    expect(output.layerC?.type).toBe('STRUCTURAL_QUESTION');
  });

  it('非臨界点でLayer Cがundefinedであること', () => {
    const rawChunks = createTestRawChunks(3);
    const nonCriticalState = {
      dominantState: 'M1' as const,
      confidence: 'HIGH' as const,
      isCritical: false,
      observationBasis: []
    };
    
    const output = generateLearningStructure(rawChunks, nonCriticalState);
    
    expect(output.layerC).toBeUndefined();
  });
});

// ============================================
// 5. Chunk Operations Tests
// ============================================

describe('reorderChunks', () => {
  it('新しい順序で並べ替えられること', () => {
    const chunks = createTestChunkData(3);
    const newOrder = ['chunk-2', 'chunk-0', 'chunk-1'];
    
    const reordered = reorderChunks(chunks, newOrder);
    
    expect(reordered[0].id).toBe('chunk-2');
    expect(reordered[1].id).toBe('chunk-0');
    expect(reordered[2].id).toBe('chunk-1');
  });

  it('存在しないIDは無視されること', () => {
    const chunks = createTestChunkData(2);
    const newOrder = ['chunk-0', 'nonexistent', 'chunk-1'];
    
    const reordered = reorderChunks(chunks, newOrder);
    
    expect(reordered.length).toBe(2);
  });
});

describe('toggleChunkCollapse', () => {
  it('折りたたみ状態が切り替わること', () => {
    const chunks = createTestChunkData(3);
    
    const toggled = toggleChunkCollapse(chunks, 'chunk-1');
    
    expect(toggled[0].collapsed).toBe(false);
    expect(toggled[1].collapsed).toBe(true);
    expect(toggled[2].collapsed).toBe(false);
  });
});

describe('groupChunks', () => {
  it('選択したチャンクがグループ化されること', () => {
    const chunks = createTestChunkData(4);
    
    const grouped = groupChunks(chunks, ['chunk-1', 'chunk-2'], 'group-1');
    
    expect(grouped[0].groupId).toBe(null);
    expect(grouped[1].groupId).toBe('group-1');
    expect(grouped[2].groupId).toBe('group-1');
    expect(grouped[3].groupId).toBe(null);
  });
});

describe('ungroupChunks', () => {
  it('グループが解除されること', () => {
    const chunks = createTestChunkData(3).map((c, i) => ({
      ...c,
      groupId: i === 1 || i === 2 ? 'group-1' : null
    }));
    
    const ungrouped = ungroupChunks(chunks, 'group-1');
    
    ungrouped.forEach(chunk => {
      expect(chunk.groupId).toBe(null);
    });
  });
});
