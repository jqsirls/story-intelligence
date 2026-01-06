import { Redis } from 'ioredis';
import winston from 'winston';
export declare function createRedisClient(config: {
    url: string;
}): Redis;
export declare function createSupabaseClient(url: string, key: string): import("@supabase/supabase-js").SupabaseClient<any, "public", "public", any, any>;
export declare function createLogger(service: string): winston.Logger;
//# sourceMappingURL=shared.d.ts.map