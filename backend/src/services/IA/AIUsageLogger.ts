import AIUsageLog from "../../models/AIUsageLog";
import type { AIRequest, AIResponse } from "./AIOrchestrator";

interface UsageExtras {
  tokensPrompt?: number | null;
  tokensCompletion?: number | null;
  costUsd?: number | null;
  ragDocumentIds?: number[] | null;
  errorCode?: string | null;
  errorMessage?: string | null;
}

export default class AIUsageLogger {
  static async record(
    request: AIRequest,
    response: AIResponse,
    extras: UsageExtras = {}
  ): Promise<void> {
    if (!request.companyId) {
      return;
    }

    const ragDocumentIds = extras.ragDocumentIds ?? null;

    try {
      await AIUsageLog.create({
        companyId: request.companyId,
        module: request.module,
        mode: request.mode,
        provider: response.provider,
        modelName: response.model,
        tokensPrompt: extras.tokensPrompt ?? response.promptTokens ?? null,
        tokensCompletion: extras.tokensCompletion ?? response.completionTokens ?? null,
        costUsd: extras.costUsd ?? response.costUsd ?? null,
        processingTimeMs: response.processingTime ?? null,
        ragUsed: Boolean(response.ragUsed),
        ragDocumentIds,
        success: response.success,
        errorCode: extras.errorCode ?? response.errorCode ?? null,
        errorMessage: extras.errorMessage ?? (!response.success ? response.error ?? null : null)
      });
    } catch (error) {
      console.warn("[AIUsageLogger] Falha ao gravar log de uso IA:", error);
    }
  }
}
