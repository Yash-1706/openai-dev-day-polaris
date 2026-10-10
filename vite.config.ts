import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'DEMOPILOT_');
  const apiPort = env.DEMOPILOT_API_PORT || '4329';

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: { '/api': `http://localhost:${apiPort}` }
    }
  };
});
