import { 
  OperatorLogEntry, 
  LostState, 
  StructuralFact,
  StructureNode,
  SupportPayload
} from './structure-generation-types';
import { aiService } from './ai-service';
import { SupportContextAssembler } from './support-context-assembler';

/**
 * LearnerSupportService
 * 
 * 【責務】
 * - 学習者サポートプロセスの統括
 * - 段階的LLM呼び出しの制御
 * - sandbox生成条件（RESOLVED）のチェック
 * 
 * 【設計原則】
 * - 思考の代行禁止: 重要度判断、推奨、評価を行わない
 * - 意味付け禁止: コンテンツの要約、解釈を行わない
 */
export class LearnerSupportService {
  /**
   * 学習者サポートプロセスを実行
   * 
   * 【処理フロー】
   * 1. Context Assembly
   * 2. 段階的AI Generation (detectIntent → extractNodes → generateOptions)
   * 3. RESOLVED時のみsandbox生成
   * 4. Validation
   */
  static async execute(
    nodes: readonly StructureNode[], 
    logs: readonly OperatorLogEntry[], 
    state: LostState,
    fact: StructuralFact,
    purposeAlpha: string,
    externalResources?: import('./structure-generation-types').ExternalResource[]
  ): Promise<SupportPayload> {
    
    // 1. Context Assembly
    // const context = SupportContextAssembler.assemble(nodes, logs, state, fact, purposeAlpha);

    // 2. 段階的AI Generation
    
    // Context Preparation: Use incoming nodes as base context
    // クライアントから受け取ったノードを信頼し、それをコンテキストとしてAIに渡す
    const baseContextNodes = nodes || [];

    // Phase 1: 意図検出
    const intentResult = await aiService.detectIntent(purposeAlpha);

    // Phase 2: ノード抽出（構造更新）
    // AIに現在の構造を渡し、更新された構造を受け取る
    const extractionResult = await aiService.extractNodes(purposeAlpha, intentResult, baseContextNodes as any[]);

    // Phase 3: 選択肢生成
    // 更新されたノード構造に基づいて選択肢を生成
    const optionsResult = await aiService.generateOptions(purposeAlpha, extractionResult.nodes, state);

    // AIの結果を正として採用
    // ただし、reliabilityの補完などは行う
    const finalNodes = extractionResult.nodes.map(n => ({
      ...n,
      id: n.id,
      label: n.label,
      role: 'OPTION', // Default role if missing
      depth: 1,       // Depth calculation might need refinement later
      createdAt: Date.now(),
      reliability: n.reliability || 'low'
    }));

    // Payload Assembly
    const payload: SupportPayload = {
      target_lost_state: state, 
      projection_map: {
        nodes: finalNodes,
        contradictions: extractionResult.contradictions || []
      },
      generated_options: {
        axis_label: optionsResult.question_text,
        options: optionsResult.choices
      },
      projected_resources: externalResources || [], // リソースをペイロードに追加
      detected_intent: {
        sort_intent: intentResult.sort_intent ? {
          detected: intentResult.sort_intent.detected,
          axis_label: intentResult.sort_intent.criteria,
          confidence: intentResult.sort_intent.confidence
        } : undefined,
        filter_intent: intentResult.filter_intent ? {
          detected: intentResult.filter_intent.detected,
          include_criteria: intentResult.filter_intent.criteria ? [intentResult.filter_intent.criteria] : [],
          confidence: intentResult.filter_intent.confidence
        } : undefined
      }
    };

    // 3. RESOLVED時のみsandbox生成
    if (state === 'RESOLVED') {
      const sandboxCode = await aiService.generateSandboxCode(
        purposeAlpha,
        payload.projection_map || {},
        payload.generated_options || {}
      );
      if (sandboxCode) {
        (payload as { sandbox_code?: typeof sandboxCode }).sandbox_code = sandboxCode;
      }
    }

    // 4. Validation (Schema & Security)
    if (payload.sandbox_code) {
      this.validateSandboxCode(payload.sandbox_code);
    }

    return payload;
  }

  /**
   * sandbox_codeのセキュリティ検証
   * 
   * 【チェック項目】
   * - 外部スクリプト読み込み禁止
   * - 外部通信禁止
   * - 任意コード実行禁止
   */
  private static validateSandboxCode(code: { html: string, css: string, js: string }) {
    const forbiddenPatterns = [
      /<script\s+src=['"]http/,  // 外部スクリプト
      /fetch\(/,                 // 外部通信
      /XMLHttpRequest/,          // 外部通信
      /eval\(/                   // 任意コード実行
    ];

    const combined = code.html + code.js;
    for (const pattern of forbiddenPatterns) {
      if (pattern.test(combined)) {
         console.warn('Sandbox code contained forbidden pattern, stripping code.');
         code.html = "<!-- Security Violation: Code stripped -->";
         code.js = "";
      }
    }
  }
}

