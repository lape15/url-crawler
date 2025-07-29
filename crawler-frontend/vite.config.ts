import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
  // const env = loadEnv(mode, process.cwd(), '');

  return {
    // server: {
    //   proxy: {
    //     '/crawler': {
    //       target: env.VITE_API_BASE_URL,
    //       changeOrigin: true,
    //     },
    //   },
    // },
    plugins: [react()],
  };
});
