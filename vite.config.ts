import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// "/rk9/..." is forwarded to rk9.gg, since RK9 doesn't let other sites read its pages
// directly. Netlify does the same in production (public/_redirects).
const rk9Proxy = {
  '/rk9': {
    target: 'https://rk9.gg',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/rk9/, ''),
  },
}

// https://vite.dev/config/
export default defineConfig({
  // Relative asset paths, so the built site works on any host or sub-folder.
  base: './',
  plugins: [react(), tailwindcss()],
  server: { proxy: rk9Proxy },
  preview: { proxy: rk9Proxy },
})
