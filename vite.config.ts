import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.indexOf('node_modules/react') !== -1 || id.indexOf('node_modules/lucide-react') !== -1) return 'react-vendor'
          if (id.indexOf('node_modules/prismjs') !== -1 || id.indexOf('node_modules/yaml') !== -1 || id.indexOf('node_modules/smol-toml') !== -1) return 'format-vendor'
        },
      },
    },
  },
})
