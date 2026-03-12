export const REDIS_URI_CONNECTION = process.env.REDIS_URI || "";
export const REDIS_OPT_LIMITER_MAX = process.env.REDIS_OPT_LIMITER_MAX || 1 as any;
export const REDIS_OPT_LIMITER_DURATION = process.env.REDIS_OPT_LIMITER_DURATION || 3000 as any;
export const REDIS_SECRET_KEY = process.env.REDIS_SECRET_KEY || "MULTI100";
// Usa REDIS_URI_ACK se existir, senão faz fallback para REDIS_URI
export const REDIS_URI_MSG_CONN = process.env.REDIS_URI_ACK || process.env.REDIS_URI || '';
