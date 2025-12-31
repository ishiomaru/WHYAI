// ============================================
// Output Controller
// 状態別の出力制御（Layer A/B/C表示）
// ============================================

import { LostStateEstimate } from '../types';

/**
 * 出力制御設定
 */
export interface OutputControl {
  showLayerA: boolean;
  showLayerB: boolean;
  showLayerC: boolean;
  layerBEmphasis: boolean;
  sequenceFixed: boolean;
}

/**
 * 迷子状態に基づく出力制御を決定
 */
export function determineOutputControl(estimate: LostStateEstimate): OutputControl {
  const { dominantState, isCritical } = estimate;
  
  // 臨界点では順序固定
  if (isCritical) {
    return {
      showLayerA: true,
      showLayerB: true,
      showLayerC: true,
      layerBEmphasis: false,
      sequenceFixed: true  // A → B → C の順序固定
    };
  }
  
  // 状態別制御
  switch (dominantState) {
    case 'M0':
      // レイヤーAのみ
      return {
        showLayerA: true,
        showLayerB: false,
        showLayerC: false,
        layerBEmphasis: false,
        sequenceFixed: false
      };
      
    case 'M1':
      // レイヤーA + B
      return {
        showLayerA: true,
        showLayerB: true,
        showLayerC: false,
        layerBEmphasis: false,
        sequenceFixed: false
      };
      
    case 'M2':
      // レイヤーB強調
      return {
        showLayerA: true,
        showLayerB: true,
        showLayerC: false,
        layerBEmphasis: true,
        sequenceFixed: false
      };
      
    case 'M3':
      // レイヤーC追加
      return {
        showLayerA: true,
        showLayerB: true,
        showLayerC: true,
        layerBEmphasis: false,
        sequenceFixed: false
      };
    
    case 'M4':
      // 目的-手段癒着型: レイヤーC重視
      return {
        showLayerA: true,
        showLayerB: true,
        showLayerC: true,
        layerBEmphasis: false,
        sequenceFixed: true
      };
    
    case 'M5':
      // 目的漂流型: リセット、レイヤーAのみ
      return {
        showLayerA: true,
        showLayerB: false,
        showLayerC: false,
        layerBEmphasis: false,
        sequenceFixed: false
      };
    
    case 'RESOLVED':
      // 迷子状態解消: 全レイヤー利用可能、sandbox生成可能
      return {
        showLayerA: true,
        showLayerB: true,
        showLayerC: true,
        layerBEmphasis: false,
        sequenceFixed: false
      };
      
    default:
      return {
        showLayerA: true,
        showLayerB: true,
        showLayerC: false,
        layerBEmphasis: false,
        sequenceFixed: false
      };
  }
}
