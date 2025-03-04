// 环境变量类型定义
declare namespace NodeJS {
  interface ProcessEnv {
    readonly TG_API_ID: string;
    readonly TG_API_HASH: string;
    readonly TG_SESSION_STRING: string;
  }
}
