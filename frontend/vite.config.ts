import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 生产构建由后端在 /app 下统一托管；开发环境仍使用根路径。
export default defineConfig(({ mode }) => ({
  base: mode === "production" ? "/app/" : "/",
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/assets": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
}));
