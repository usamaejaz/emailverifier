import { rm, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'

await rm(new URL('../dist', import.meta.url), { recursive: true, force: true })

for (const config of ['tsconfig.esm.json', 'tsconfig.cjs.json', 'tsconfig.types.json']) {
  execFileSync(process.execPath, ['node_modules/typescript/bin/tsc', '-p', config], {
    cwd: new URL('..', import.meta.url),
    stdio: 'inherit'
  })
}

await writeFile(new URL('../dist/cjs/package.json', import.meta.url), '{"type":"commonjs"}\n')
