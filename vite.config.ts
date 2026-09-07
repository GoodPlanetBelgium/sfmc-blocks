import { sveltekit } from '@sveltejs/kit/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  server: {
    proxy: {
      '/proxy-image': {
        target: 'https://image.email.goodplanet.be',
        changeOrigin: true,
        rewrite: (path) => {
          // Extract the URL from the query param and rewrite the path
          const url = new URL(path, 'http://localhost')
          const targetPath = url.searchParams.get('url')
          return targetPath || '/'
        }
      }
    }
  }
})
