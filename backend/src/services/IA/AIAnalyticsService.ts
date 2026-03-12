import { QueryTypes } from "sequelize";
import sequelize from "../../database";

export interface ProviderStats {
  provider: string;
  requests: number;
  successRate: number;
  avgProcessingTimeMs: number;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
  ragRequests: number;
  lastRequest?: string | null;
}

export interface ModuleStats {
  module: string;
  requests: number;
  successRate: number;
  avgProcessingTimeMs: number;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
  ragRequests: number;
}

export interface DailyUsageStats {
  date: string;
  requests: number;
  successRate: number;
  costUsd: number;
  ragRequests: number;
  avgProcessingTimeMs: number;
}

export interface TopDocumentStats {
  documentId: number;
  title: string;
  hits: number;
  lastUsedAt: string;
}

export interface AIAnalyticsResult {
  timeframe: {
    start: string;
    end: string;
    windowDays: number;
  };
  totalRequests: number;
  successRate: number;
  avgProcessingTimeMs: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalTokens: number;
  totalCostUsd: number;
  rag: {
    requests: number;
    successRate: number;
    topDocuments: TopDocumentStats[];
  };
  providers: ProviderStats[];
  modules: ModuleStats[];
  dailyUsage: DailyUsageStats[];
}

const toNumber = (value: any): number => (value === null || value === undefined ? 0 : Number(value));

const calculateRate = (part: number, total: number): number => {
  if (!total) return 0;
  return Number(((part / total) * 100).toFixed(2));
};

export const getAIAnalytics = async (
  companyId: number,
  options: { days?: number } = {}
): Promise<AIAnalyticsResult> => {
  const windowDays = options.days ?? 30;
  const now = new Date();
  const since = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);
  since.setHours(0, 0, 0, 0);

  const replacements = {
    companyId,
    since: since.toISOString()
  };

  const summaryRows = await sequelize.query(
    `SELECT
       COUNT(*) AS "requests",
       SUM(CASE WHEN success THEN 1 ELSE 0 END) AS "successes",
       AVG("processingTimeMs") AS "avgProcessing",
       SUM(COALESCE("tokensPrompt", 0)) AS "promptTokens",
       SUM(COALESCE("tokensCompletion", 0)) AS "completionTokens",
       SUM(COALESCE("costUsd", 0)) AS "costUsd",
       SUM(CASE WHEN "ragUsed" THEN 1 ELSE 0 END) AS "ragRequests",
       SUM(CASE WHEN "ragUsed" AND success THEN 1 ELSE 0 END) AS "ragSuccesses"
     FROM "AIUsageLogs"
     WHERE "companyId" = :companyId
       AND "createdAt" >= :since`,
    { replacements, type: QueryTypes.SELECT }
  );

  const summary = (summaryRows as any[])[0] || {};
  const totalRequests = toNumber(summary.requests);
  const totalSuccesses = toNumber(summary.successes);
  const totalPromptTokens = toNumber(summary.promptTokens);
  const totalCompletionTokens = toNumber(summary.completionTokens);
  const totalCostUsd = Number(toNumber(summary.costUsd).toFixed(4));
  const avgProcessingTimeMs = toNumber(summary.avgProcessing);

  const ragRequests = toNumber(summary.ragRequests);
  const ragSuccesses = toNumber(summary.ragSuccesses);

  const providerRows = await sequelize.query(
    `SELECT
       "provider",
       COUNT(*) AS "requests",
       SUM(CASE WHEN success THEN 1 ELSE 0 END) AS "successes",
       AVG("processingTimeMs") AS "avgProcessing",
       SUM(COALESCE("tokensPrompt", 0)) AS "promptTokens",
       SUM(COALESCE("tokensCompletion", 0)) AS "completionTokens",
       SUM(COALESCE("costUsd", 0)) AS "costUsd",
       SUM(CASE WHEN "ragUsed" THEN 1 ELSE 0 END) AS "ragRequests",
       MAX("createdAt") AS "lastRequest"
     FROM "AIUsageLogs"
     WHERE "companyId" = :companyId
       AND "createdAt" >= :since
     GROUP BY "provider"
     ORDER BY "requests" DESC`,
    { replacements, type: QueryTypes.SELECT }
  );

  const providers: ProviderStats[] = (providerRows as any[]).map(row => {
    const requests = toNumber(row.requests);
    const successes = toNumber(row.successes);
    return {
      provider: row.provider,
      requests,
      successRate: calculateRate(successes, requests),
      avgProcessingTimeMs: toNumber(row.avgProcessing),
      promptTokens: toNumber(row.promptTokens),
      completionTokens: toNumber(row.completionTokens),
      costUsd: Number(toNumber(row.costUsd).toFixed(4)),
      ragRequests: toNumber(row.ragRequests),
      lastRequest: row.lastRequest ? new Date(row.lastRequest).toISOString() : null
    };
  });

  const moduleRows = await sequelize.query(
    `SELECT
       "module",
       COUNT(*) AS "requests",
       SUM(CASE WHEN success THEN 1 ELSE 0 END) AS "successes",
       AVG("processingTimeMs") AS "avgProcessing",
       SUM(COALESCE("tokensPrompt", 0)) AS "promptTokens",
       SUM(COALESCE("tokensCompletion", 0)) AS "completionTokens",
       SUM(COALESCE("costUsd", 0)) AS "costUsd",
       SUM(CASE WHEN "ragUsed" THEN 1 ELSE 0 END) AS "ragRequests"
     FROM "AIUsageLogs"
     WHERE "companyId" = :companyId
       AND "createdAt" >= :since
     GROUP BY "module"
     ORDER BY "requests" DESC`,
    { replacements, type: QueryTypes.SELECT }
  );

  const modules: ModuleStats[] = (moduleRows as any[]).map(row => {
    const requests = toNumber(row.requests);
    const successes = toNumber(row.successes);
    return {
      module: row.module,
      requests,
      successRate: calculateRate(successes, requests),
      avgProcessingTimeMs: toNumber(row.avgProcessing),
      promptTokens: toNumber(row.promptTokens),
      completionTokens: toNumber(row.completionTokens),
      costUsd: Number(toNumber(row.costUsd).toFixed(4)),
      ragRequests: toNumber(row.ragRequests)
    };
  });

  const dailyRows = await sequelize.query(
    `SELECT
       DATE_TRUNC('day', "createdAt") AS "day",
       COUNT(*) AS "requests",
       SUM(CASE WHEN success THEN 1 ELSE 0 END) AS "successes",
       AVG("processingTimeMs") AS "avgProcessing",
       SUM(COALESCE("costUsd", 0)) AS "costUsd",
       SUM(CASE WHEN "ragUsed" THEN 1 ELSE 0 END) AS "ragRequests"
     FROM "AIUsageLogs"
     WHERE "companyId" = :companyId
       AND "createdAt" >= :since
     GROUP BY 1
     ORDER BY 1 ASC`,
    { replacements, type: QueryTypes.SELECT }
  );

  const dailyUsage: DailyUsageStats[] = (dailyRows as any[]).map(row => {
    const requests = toNumber(row.requests);
    const successes = toNumber(row.successes);
    return {
      date: new Date(row.day).toISOString(),
      requests,
      successRate: calculateRate(successes, requests),
      costUsd: Number(toNumber(row.costUsd).toFixed(4)),
      ragRequests: toNumber(row.ragRequests),
      avgProcessingTimeMs: toNumber(row.avgProcessing)
    };
  });

  const topDocRows = await sequelize.query(
    `SELECT
       d."id" AS "documentId",
       d."title" AS "title",
       COUNT(*) AS "hits",
       MAX(l."createdAt") AS "lastUsedAt"
     FROM "AIUsageLogs" l
     JOIN LATERAL jsonb_array_elements_text(COALESCE(l."ragDocumentIds", '[]'::jsonb)) AS doc(doc_id) ON TRUE
     JOIN "KnowledgeDocuments" d ON d."id" = (doc.doc_id)::INT
     WHERE l."companyId" = :companyId
       AND l."createdAt" >= :since
     GROUP BY d."id", d."title"
     ORDER BY "hits" DESC
     LIMIT 10`,
    { replacements, type: QueryTypes.SELECT }
  );

  const topDocuments: TopDocumentStats[] = (topDocRows as any[]).map(row => ({
    documentId: Number(row.documentId),
    title: row.title,
    hits: toNumber(row.hits),
    lastUsedAt: row.lastUsedAt ? new Date(row.lastUsedAt).toISOString() : new Date().toISOString()
  }));

  const successRate = calculateRate(totalSuccesses, totalRequests);
  const ragSuccessRate = calculateRate(ragSuccesses, ragRequests);

  return {
    timeframe: {
      start: since.toISOString(),
      end: now.toISOString(),
      windowDays
    },
    totalRequests,
    successRate,
    avgProcessingTimeMs,
    totalPromptTokens,
    totalCompletionTokens,
    totalTokens: totalPromptTokens + totalCompletionTokens,
    totalCostUsd,
    rag: {
      requests: ragRequests,
      successRate: ragSuccessRate,
      topDocuments
    },
    providers,
    modules,
    dailyUsage
  };
};
