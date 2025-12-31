// ============================================
// Intervention Control Service Tests
// ============================================

// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  DominantStrayStateEstimator,
  CriticalInterventionController,
  determineOutputControl
} from '../core';
import type {
  OperatorLogEntry,
  StructuralDeltaType,
  LostStateEstimate
} from '../structure-generation-types';
import { createEmptyStructuralDelta } from '../structure-generation-types';

// ============================================
// Test Helpers
// ============================================

function createTestLog(
  operatorId: 'O0' | 'O1' | 'O2' | 'O3' | 'O4' | 'O5',
  delta: Partial<StructuralDeltaType> = {}
): OperatorLogEntry {
  return {
    id: `log-${Date.now()}-${Math.random()}`,
    operatorId,
    targetNodeIds: [],
    timestamp: Date.now(),
    structuralDelta: {
      ...createEmptyStructuralDelta(),
      ...delta
    },
    attemptType: 'REORDER_ATTEMPT'
  };
}

// ============================================
// 1. DominantStrayStateEstimator Tests
// ============================================

describe('DominantStrayStateEstimator', () => {
  let estimator: DominantStrayStateEstimator;

  beforeEach(() => {
    estimator = new DominantStrayStateEstimator();
  });

  it('迷子状態を「断定」ではなく「推定」として返すこと', () => {
    const logs: OperatorLogEntry[] = [
      createTestLog('O0', { nodeDelta: 1 }),
      createTestLog('O1', { nodeDelta: 1 })
    ];
    const deltas = logs.map(l => l.structuralDelta);
    
    const estimate = estimator.estimate(logs, deltas);
    
    // 推定結果として必要なプロパティが存在
    expect(estimate).toHaveProperty('dominantState');
    expect(estimate).toHaveProperty('confidence');
    expect(estimate).toHaveProperty('isCritical');
    expect(estimate).toHaveProperty('observationBasis');
    
    // 「断定」を示すプロパティが存在しない
    expect(estimate).not.toHaveProperty('confirmed');
    expect(estimate).not.toHaveProperty('definite');
  });

  it('M0: O0に反応なしで目的不明型と推定', () => {
    // O0操作に対して構造変化なし
    const logs: OperatorLogEntry[] = [
      createTestLog('O0'), // delta = 0（反応なし）
      createTestLog('O0'),
      createTestLog('O1', { nodeDelta: 1 })
    ];
    const deltas = logs.map(l => l.structuralDelta);
    
    const estimate = estimator.estimate(logs, deltas);
    
    expect(estimate.dominantState).toBe('M0');
  });

  it('M1: ノード変化が極端に少ない場合', () => {
    const logs: OperatorLogEntry[] = [
      createTestLog('O0', { nodeDelta: 1 }),
      createTestLog('O1'), // 変化なし
      createTestLog('O2'), // 変化なし
    ];
    const deltas = logs.map(l => l.structuralDelta);
    
    const estimate = estimator.estimate(logs, deltas);
    
    expect(estimate.dominantState).toBe('M1');
  });

  it('TC-3: 臨界点介入順序 - 連続停滞で臨界点検出', () => {
    // 連続して構造変化なし
    const logs: OperatorLogEntry[] = [
      createTestLog('O0'),
      createTestLog('O1'),
      createTestLog('O2'),
    ];
    const deltas = logs.map(l => l.structuralDelta);
    
    const estimate = estimator.estimate(logs, deltas);
    
    expect(estimate.isCritical).toBe(true);
  });

  it('構造変化がある場合は臨界点でない', () => {
    const logs: OperatorLogEntry[] = [
      createTestLog('O0', { nodeDelta: 1 }),
      createTestLog('O1', { depthDelta: 1 }),
      createTestLog('O2', { choiceDelta: -1 }),
    ];
    const deltas = logs.map(l => l.structuralDelta);
    
    const estimate = estimator.estimate(logs, deltas);
    
    expect(estimate.isCritical).toBe(false);
  });

  it('信頼度がログ数に基づいて決定されること', () => {
    // 少ないログ
    const fewLogs = [createTestLog('O0', { nodeDelta: 1 })];
    const estimateLow = estimator.estimate(fewLogs, fewLogs.map(l => l.structuralDelta));
    expect(estimateLow.confidence).toBe('LOW');
    
    // 多くのログ
    const manyLogs = Array(15).fill(null).map(() => 
      createTestLog('O0', { nodeDelta: 1 })
    );
    const estimateHigh = estimator.estimate(manyLogs, manyLogs.map(l => l.structuralDelta));
    expect(estimateHigh.confidence).toBe('HIGH');
  });
});

// ============================================
// 2. CriticalInterventionController Tests
// ============================================

describe('CriticalInterventionController', () => {
  let controller: CriticalInterventionController;
  let criticalEstimate: LostStateEstimate;
  let nonCriticalEstimate: LostStateEstimate;

  beforeEach(() => {
    controller = new CriticalInterventionController();
    
    criticalEstimate = {
      dominantState: 'M1',
      confidence: 'HIGH',
      isCritical: true,
      observationBasis: [createTestLog('O1')]
    };
    
    nonCriticalEstimate = {
      dominantState: 'M1',
      confidence: 'HIGH',
      isCritical: false,
      observationBasis: []
    };
  });

  it('非臨界点では介入実行がエラー', async () => {
    await expect(
      controller.executeIntervention(nonCriticalEstimate)
    ).rejects.toThrow('Not at critical point');
  });

  it('介入開始時にPHASE_Aになること', async () => {
    const interventionPromise = controller.executeIntervention(criticalEstimate);
    
    // 介入開始を少し待つ
    await new Promise(r => setTimeout(r, 10));
    
    expect(controller.currentPhase).toBe('PHASE_A');
    
    // 介入を完了させる
    controller.acknowledge();
    await new Promise(r => setTimeout(r, 10));
    controller.acknowledge();
    await interventionPromise;
  });

  it('介入完了でCOMPLETEになること', async () => {
    const interventionPromise = controller.executeIntervention(criticalEstimate);
    
    // Phase A確認
    await new Promise(r => setTimeout(r, 10));
    controller.acknowledge();
    
    // Phase B確認
    await new Promise(r => setTimeout(r, 10));
    controller.acknowledge();
    
    // 完了待ち
    const result = await interventionPromise;
    
    expect(controller.currentPhase).toBe('COMPLETE');
    expect(result.layerA).toBeDefined();
    expect(result.layerB).toBeDefined();
    expect(result.layerC).toBeDefined();
  });

  it('Layer Aが事実のみを含むこと（評価を含まない）', async () => {
    const interventionPromise = controller.executeIntervention(criticalEstimate);
    
    await new Promise(r => setTimeout(r, 10));
    controller.acknowledge();
    await new Promise(r => setTimeout(r, 10));
    controller.acknowledge();
    
    const result = await interventionPromise;
    
    expect(result.layerA.type).toBe('FACT');
    expect(result.layerA.content).toContain('回で構造に変化がありませんでした');
    expect(result.layerA.content).not.toContain('問題');
    expect(result.layerA.content).not.toContain('改善');
  });

  it('Layer Cが構造内在型問いであること', async () => {
    const interventionPromise = controller.executeIntervention(criticalEstimate);
    
    await new Promise(r => setTimeout(r, 10));
    controller.acknowledge();
    await new Promise(r => setTimeout(r, 10));
    controller.acknowledge();
    
    const result = await interventionPromise;
    
    expect(result.layerC.type).toBe('STRUCTURAL_QUESTION');
    // 判断を要求しない形式であること
    expect(result.layerC.content).not.toContain('どうしますか');
    expect(result.layerC.content).not.toContain('何が問題');
  });
});

// ============================================
// 3. Output Control Tests
// ============================================

describe('determineOutputControl', () => {
  it('臨界点で順序固定', () => {
    const estimate: LostStateEstimate = {
      dominantState: 'M1',
      confidence: 'HIGH',
      isCritical: true,
      observationBasis: []
    };
    
    const control = determineOutputControl(estimate);
    
    expect(control.sequenceFixed).toBe(true);
    expect(control.showLayerA).toBe(true);
    expect(control.showLayerB).toBe(true);
    expect(control.showLayerC).toBe(true);
  });

  it('M0でレイヤーAのみ', () => {
    const estimate: LostStateEstimate = {
      dominantState: 'M0',
      confidence: 'HIGH',
      isCritical: false,
      observationBasis: []
    };
    
    const control = determineOutputControl(estimate);
    
    expect(control.showLayerA).toBe(true);
    expect(control.showLayerB).toBe(false);
    expect(control.showLayerC).toBe(false);
  });

  it('M2でレイヤーB強調', () => {
    const estimate: LostStateEstimate = {
      dominantState: 'M2',
      confidence: 'HIGH',
      isCritical: false,
      observationBasis: []
    };
    
    const control = determineOutputControl(estimate);
    
    expect(control.layerBEmphasis).toBe(true);
  });
});
