import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Split the heavy vendor libraries into their own long-cached chunks so
        // the main app bundle stays small (clears the >500 kB chunk warning).
        // Function form because Vite 8's Rolldown bundler requires it (an object
        // map is rejected). Leaflet is already lazy (only the map page imports
        // it), so its chunk loads on demand; the rest ship up front but cache
        // independently. Order matters: match react-leaflet under leaflet first.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('leaflet')) return 'vendor-leaflet' // leaflet + react-leaflet
          if (id.includes('@supabase')) return 'vendor-supabase'
          if (id.includes('@tanstack')) return 'vendor-query'
          if (id.includes('react-router') || /[\\/]react(-dom)?[\\/]/.test(id)) return 'vendor-react'
          return undefined
        },
      },
    },
  },
  test: {
    // jsdom so React component tests (Testing Library) have a DOM + localStorage.
    // The existing pure-logic lib tests run fine under jsdom too.
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.{test,spec}.{js,jsx}'],
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
  },
})
