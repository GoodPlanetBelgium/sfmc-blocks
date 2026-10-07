import { copyFileSync, mkdirSync, readdirSync } from 'fs'
import { join } from 'path'

// Publishes the email footers next to the blocks, so the email renderer in
// goodplanet-apps (apps/sfmc-assets) can read them from GitHub Pages.
const footersDir = 'etc'
const distDir = join('dist', 'footers')

mkdirSync(distDir, { recursive: true })

for (const footer of readdirSync(footersDir).filter((file) => file.endsWith('.html'))) {
  copyFileSync(join(footersDir, footer), join(distDir, footer))
}
