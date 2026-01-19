/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",

  // Environment variables for runtime
  // 运行时环境变量
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || "https://gushen.lurus.cn",
    USE_MOCK_DATA: process.env.USE_MOCK_DATA || "false",
    LURUS_API_URL:
      process.env.LURUS_API_URL ||
      "http://lurus-api.lurus-system.svc.cluster.local:8850",
  },
};

export default nextConfig;
