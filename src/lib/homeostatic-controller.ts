
import { 
  LostStateEstimate, 
  LearningStructureOutput, 
  StructureNode,
  StructuralQuestion,
  OperatorLogEntry,
  ExternalResource
} from './structure-generation-types';
import { 
  IntentClassifier, 
  SemanticState, 
  ProjectionMapper,
  UserIntent
} from './semantic-bridge';

// ============================================
// Homeostatic Controller
// 動的ホメオスタシス制御（呼吸の調整）
// ============================================

export interface HomeostaticState {
  readonly isStable: boolean;
  readonly loadLevel: number; // 0.0 - 1.0 (Cognitive Load)
  readonly semanticState: SemanticState;
}

/**
 * 学習の「呼吸」を制御するコントローラー
 */
export class HomeostaticController {

  /**
   * 状態の統合と判定
   */
  static integrateState(
    estimate: LostStateEstimate,
    semanticState: SemanticState
  ): HomeostaticState {
    
    // 安定性の判定
    // 迷子状態がM5(漂流)以外で、かつ信頼度が高い場合は「不安定」
    // M0(初期)も「不安定」だが、行動開始前なので特別扱いが必要かも
    // ここではシンプルに「Criticalでない」かつ「M0, M1, M2でない」を安定とする定義を試みる
    // ただし、SYSTEM_DESIGNでは M0-M5 全てが「迷子」なので、
    // 本当の「安定」とは「行動可能な状態 (M5脱出)」を指す。
    // APIの仕様上、M5脱出判定はフロントエンドのオペレーション(Choice)で決まるが、
    // サーバー側では「推定結果がCriticalでない」ことを一定の安定とみなす。
    
    // 独自ロジック:
    // ドリフトが高い(>0.6) -> 不安定
    // Criticalフラグ -> 不安定
    // 迷子状態が M0, M1, M2 -> 不安定 (問いが必要)
    // 迷子状態が M3, M4, M5 -> 相対的に安定 (資源投影のチャンスあり)
    
    const isDeepLost = ['M0', 'M1', 'M2'].includes(estimate.dominantState);
    const isUnstable = estimate.isCritical || isDeepLost || semanticState.drift > 0.6;

    // 負荷レベル (簡易推定)
    // Criticalなら負荷MAX
    const loadLevel = estimate.isCritical ? 1.0 : (estimate.confidence === 'HIGH' ? 0.8 : 0.4);

    return {
      isStable: !isUnstable,
      loadLevel,
      semanticState
    };
  }

  /**
   * 介入ゲイン（問いの強さ）を計算
   */
  static calculateInterventionGain(state: HomeostaticState): number {
    // 負荷が高いときは、介入を弱める（優しくする）か、逆に強くする（強制リセット）か？
    // SYSTEM_DESIGNでは「混乱時は問いで介入」なので、不安定なほどGainは高くなる。
    
    if (!state.isStable) {
        return 0.8 + (state.semanticState.drift * 0.2); // 0.8 ~ 1.0
    }
    return 0.2; // 安定時は低い
  }

  /**
   * 意思決定: 問い(Question) か 投影(Projection) か
   */
  static decideAction(
    homeostaticState: HomeostaticState,
    resources: ExternalResource[]
  ): 'QUESTION' | 'PROJECTION' {
    // 安定していて、かつ意図が明確なら投影
    if (homeostaticState.isStable && homeostaticState.semanticState.intent !== 'UNCLEAR') {
      return 'PROJECTION';
    }
    // それ以外は問い
    return 'QUESTION';
  }

  /**
   * 投影を実行
   */
  static executeProjection(
    semanticState: SemanticState,
    resources: ExternalResource[],
    currentNodes: StructureNode[]
  ): StructureNode[] {
    // 意図に基づいてフィルタリング
    const filtered = ProjectionMapper.filterResources(resources, semanticState.intent);
    
    // 現在の最大深度を取得
    const currentMaxDepth = currentNodes.reduce((max, node) => Math.max(max, node.depth), 0);
    
    // ノード化
    return ProjectionMapper.mapToNodes(filtered, currentMaxDepth);
  }
}
