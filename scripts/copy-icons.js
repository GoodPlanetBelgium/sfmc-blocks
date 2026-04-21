import { copyFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

const iconsDir = 'src/icons'
const distDir = 'dist'

const icons = readdirSync(iconsDir)
const blocks = readdirSync(distDir).filter((entry) =>
  statSync(join(distDir, entry)).isDirectory()
)

for (const block of blocks) {
  for (const icon of icons) {
    copyFileSync(join(iconsDir, icon), join(distDir, block, icon))
  }
}
