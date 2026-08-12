import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // This is a browser-local utility suite; production source maps add about
    // 19 MB to every deployment and can be fetched when DevTools is open.
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.indexOf('node_modules/react') !== -1 || id.indexOf('node_modules/lucide-react') !== -1) return 'react-vendor'
          if (id.indexOf('node_modules/prismjs') !== -1) return 'syntax-vendor'
          if (id.indexOf('node_modules/yaml') !== -1) return 'yaml-vendor'
          if (id.indexOf('node_modules/smol-toml') !== -1) return 'toml-vendor'
        },
      },
    },
  },
})
