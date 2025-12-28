
// Node.js v18+ has global fetch. No import needed.
// import fetch from 'node-fetch'; 

const BASE_URL = 'http://localhost:3000/api/structure-generation';

interface OperatorLogEntry {
    id: string;
    operatorId: string;
    targetNodeIds: string[];
    timestamp: number;
    structuralDelta: any;
    attemptType: string;
}

interface RequestBody {
    purposeAlpha: string;
    operatorLogs?: OperatorLogEntry[];
}

async function callApi(body: RequestBody, stepName: string) {
    console.log(`\n=== STEP: ${stepName} ===`);
    console.log(`Input Purpose: "${body.purposeAlpha}"`);
    console.log(`Logs Count: ${body.operatorLogs?.length || 0}`);

    try {
        const res = await fetch(BASE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            console.error(`Error: ${res.status} ${res.statusText}`);
            console.error(await res.text());
            return null;
        }

        const data = await res.json();
        // 結果の簡易・重要部分のみ表示
        console.log(`[Response]`);
        if (data.lostStateEstimate) {
            console.log(`LostState: ${data.lostStateEstimate.dominantState} (Critical: ${data.lostStateEstimate.isCritical})`);
        } else {
             console.log(`LostState: None (Default M0)`);
        }
        
        if (data.structure.layerC) {
            console.log(`Question (Layer C): ${data.structure.layerC.content}`);
            // 厳格な検証: 内部意味構造の確認
            if (data.structure.layerC.semantics) {
                const s = data.structure.layerC.semantics;
                console.log(`[VERIFIED] Internal Semantics:`);
                console.log(`  - Operation: ${s.operationType}`);
                console.log(`  - QuestionType: ${s.questionType}`);
                console.log(`  - Variables: ${JSON.stringify(s.variables)}`);
            } else {
                 console.warn(`[WARNING] No Semantics found in Layer C! Logic might be bypassing Strict Derivation.`);
            }
        } else {
            console.log(`Question (Layer C): None`);
        }
        
        // 資源投影 (Layer A に RESOURCE チャンクが含まれているか確認)
        const resources = data.structure.layerA.chunks.filter((c: any) => c.text.startsWith('[RESOURCE]'));
        if (resources.length > 0) {
            console.log(`Projected Resources: ${resources.length} items`);
            resources.slice(0, 3).forEach((r: any) => console.log(` - ${r.text.substring(0, 50)}...`));
        }

        return data;

    } catch (e) {
        console.error('Fetch error:', e);
        return null;
    }
}

// ==========================================
// SCENARIO 1: Aoi (M1 <-> M2 Vibration)
// ==========================================
async function simulateAoi() {
    console.log('\n=============================================');
    console.log(' SCENARIO: Aoi (完璧主義者)');
    console.log('=============================================');

    let logs: OperatorLogEntry[] = [];

    // Turn 1: 漠然とした、しかし"完全に理解したい"という重い目的
    // 期待: M0 -> O0 (目的具体化の問い)
    await callApi({
        purposeAlpha: "Reactのレンダリングの仕組みを完全に理解したい"
    }, "Turn 1: Initial (Heavy Intent)");

    // Turn 2: 問いを受けて、少し具体化するが、まだ深い (Deep Dive)
    // 期待: Semantic Bridge "DEEP_DIVE" 検知 -> Projection (粒度: High)
    // ここで一気に資源が出るはず
    await callApi({
        purposeAlpha: "React Fiberのソースコードレベルでの挙動を知りたい"
    }, "Turn 2: Response to Question (Deep Dive)");

    // Turn 3: 資源を見たが、難しすぎて混乱 (Drift発生)
    // ログを追加: 停滞 (Stagnation)
    logs.push({
        id: 'log-1', operatorId: 'O1', targetNodeIds: [], timestamp: Date.now(),
        structuralDelta: { nodeDelta: 0, depthDelta: 0, choiceDelta: 0, relationDelta: 0, focusDelta: 0 },
        attemptType: 'COLLAPSE_ATTEMPT'
    });
    logs.push({
        id: 'log-2', operatorId: 'O1', targetNodeIds: [], timestamp: Date.now() + 1000,
        structuralDelta: { nodeDelta: 0, depthDelta: 0, choiceDelta: 0, relationDelta: 0, focusDelta: 0 },
        attemptType: 'COLLAPSE_ATTEMPT'
    });
    
    // 期待: M1/M2 (Stagnation) + Discomfort -> Questioning (Intervention)
    await callApi({
        purposeAlpha: "難しくて全然わからない。Fiberって何？",
        operatorLogs: logs
    }, "Turn 3: Confusion (Stagnation)");

    // Turn 4: 問い「作りたいものにどう影響しますか？」を受けて、目的を修正 (Repair)
    // 期待: Semantic Bridge "SPECIFIC_NEED" or "BROAD" -> Projection (粒度: Low)
    await callApi({
        purposeAlpha: "使い方がわかればいい。コンポーネントを作りたい。",
        operatorLogs: [] // メンタルリセットとしてログをクリア
    }, "Turn 4: Repair (Shift to Usage)");
}

// Run
simulateAoi();
