// Global test configuration type definitions
declare global {
  var testConfig: {
    apiBaseUrl: string;
    supabaseUrl: string;
    supabaseAnonKey: string;
    redisUrl: string;
    testTimeout: number;
  };
  
  namespace NodeJS {
    interface Global {
      testConfig: {
        apiBaseUrl: string;
        supabaseUrl: string;
        supabaseAnonKey: string;
        redisUrl: string;
        testTimeout: number;
      };
    }
  }
}

export {};