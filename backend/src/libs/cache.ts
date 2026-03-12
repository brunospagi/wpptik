import hmacSHA512 from "crypto-js/hmac-sha512";
import Base64 from "crypto-js/enc-base64";
import { REDIS_URI_CONNECTION } from "../config/redis";

class CacheSingleton {
  // Usa any para permitir fallback em memória quando não houver Redis
  private redis: any;

  private static instance: CacheSingleton;

  private constructor(redisInstance: any) {
    this.redis = redisInstance;
  }

  public static getInstance(redisInstance: any): CacheSingleton {
    if (!CacheSingleton.instance) {
      CacheSingleton.instance = new CacheSingleton(redisInstance);
    }
    return CacheSingleton.instance;
  }

  private static encryptParams(params: any) {
    const str = JSON.stringify(params);
    const key = Base64.stringify(hmacSHA512(str, str));
    return key;
  }

  public async set(
    key: string,
    value: string,
    option?: string,
    optionValue?: string | number
  ): Promise<string> {
    if (option !== undefined && optionValue !== undefined) {
      return this.redis.set(key, value, option, optionValue);
    }
    return this.redis.set(key, value);
  }

  public async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  public async getKeys(pattern: string): Promise<string[]> {
    return this.redis.keys(pattern);
  }

  public async del(key: string): Promise<number> {
    return this.redis.del(key);
  }

  public async delFromPattern(pattern: string): Promise<void> {
    const all = await this.getKeys(pattern);
    await Promise.all(all.map(item => this.del(item)));
  }

  public async setFromParams(
    key: string,
    params: any,
    value: string,
    option?: string,
    optionValue?: string | number
  ): Promise<string> {
    const finalKey = `${key}:${CacheSingleton.encryptParams(params)}`;
    if (option !== undefined && optionValue !== undefined) {
      return this.set(finalKey, value, option, optionValue);
    }
    return this.set(finalKey, value);
  }

  public async getFromParams(key: string, params: any): Promise<string | null> {
    const finalKey = `${key}:${CacheSingleton.encryptParams(params)}`;
    return this.get(finalKey);
  }

  public async delFromParams(key: string, params: any): Promise<number> {
    const finalKey = `${key}:${CacheSingleton.encryptParams(params)}`;
    return this.del(finalKey);
  }

  public getRedisInstance(): any {
    return this.redis;
  }
}

// Fallback simples em memória quando REDIS_URI não estiver configurado
function createInMemoryRedis() {
  const store = new Map<string, string>();
  return {
    async set(key: string, value: string) {
      store.set(key, value);
      return "OK";
    },
    async get(key: string) {
      return store.has(key) ? (store.get(key) as string) : null;
    },
    async keys(pattern: string) {
      // suporte básico a '*' no final/meio
      const regex = new RegExp(
        "^" + pattern.replace(/[.+^${}()|\\[\\]\\\\]/g, "\\$&").replace(/\\\*/g, ".*") + "$"
      );
      return Array.from(store.keys()).filter(k => regex.test(k));
    },
    async del(key: string) {
      return store.delete(key) ? 1 : 0;
    }
  };
}

let redisInstance: any = null;
try {
  const Redis = require("ioredis");
  if (REDIS_URI_CONNECTION) {
    redisInstance = new Redis(REDIS_URI_CONNECTION);
  } else {
    redisInstance = createInMemoryRedis();
  }
} catch (e) {
  // ioredis não instalado: usa fallback em memória
  redisInstance = createInMemoryRedis();
}

export default CacheSingleton.getInstance(redisInstance);