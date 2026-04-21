import { sveltekit } from '@sveltejs/kit/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { copyFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

function copyIconsToBlocks(): import('vite').Plugin {
  return {
    name: 'copy-icons-to-blocks',
    closeBundle() {
      const iconsDir = 'src/icons'
      const distDir = 'dist'
      const icons = readdirSync(iconsDir)
      const blocks = readdirSync(distDir).filter((entry: string) =>
        statSync(join(distDir, entry)).isDirectory()
      )
      for (const block of blocks) {
        for (const icon of icons) {
          copyFileSync(join(iconsDir, icon), join(distDir, block, icon))
        }
      }
    }
  }
}

export default defineConfig({
  plugins: [tailwindcss(), sveltekit(), copyIconsToBlocks()]
})
