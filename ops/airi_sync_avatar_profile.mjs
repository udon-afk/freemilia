#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const workspaceRoot = resolve(new URL('..', import.meta.url).pathname)
const sourcePath = resolve(workspaceRoot, 'ops/AIRI_AVATAR_EXPRESSION_PROFILE_V1.json')
const outputPath = resolve(workspaceRoot, 'products/airi/apps/stage-web/public/bridge/output/avatar-expression-profile.json')

const raw = readFileSync(sourcePath, 'utf8')
const parsed = JSON.parse(raw)

mkdirSync(dirname(outputPath), { recursive: true })
writeFileSync(outputPath, `${JSON.stringify(parsed, null, 2)}\n`, 'utf8')

console.log(`[AIRI] avatar profile synced: ${sourcePath} -> ${outputPath}`)
