const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { join } = require('node:path')
const test = require('node:test')

const root = join(__dirname, '..')
const page = readFileSync(join(root, 'src/pages/me/settings/backup.vue'), 'utf8')
const backup = readFileSync(join(root, 'src/utils/backup.ts'), 'utf8')
const database = readFileSync(join(root, 'src/db/index.ts'), 'utf8')
const tokens = readFileSync(join(root, 'src/uni.scss'), 'utf8')
const pages = JSON.parse(readFileSync(join(root, 'src/pages.json'), 'utf8'))

function functionBody(source, name, nextName) {
  const start = source.indexOf(`async function ${name}`)
  const end = source.indexOf(`async function ${nextName}`, start)
  assert.notEqual(start, -1, `${name} should exist`)
  assert.notEqual(end, -1, `${nextName} should exist after ${name}`)
  return source.slice(start, end)
}

test('backup page keeps real export and all three staged restore entrances', () => {
  assert.match(page, /exportBackup/)
  assert.match(page, /listBackupFiles/)
  assert.match(page, /readBackupFile/)
  assert.match(page, /pickLocalBackupText/)
  assert.match(page, /parseBackupText/)
  assert.match(page, /importBackup/)
  assert.match(page, /粘贴 backup_\*\.json 内容/)
  assert.match(page, /@input="handleImportInput"/)
  assert.match(page, /手动粘贴内容/)
  assert.match(page, /:maxlength="-1"/)

  const savedFlow = functionBody(page, 'pickFromSavedBackups', 'pickFromLocalFile')
  assert.match(savedFlow, /importText\.value/)
  assert.doesNotMatch(savedFlow, /importBackup/)

  const localFlow = functionBody(page, 'pickFromLocalFile', 'doClear')
  assert.match(localFlow, /importText\.value\s*=\s*await pickLocalBackupText/)
  assert.doesNotMatch(localFlow, /importBackup/)
})

test('backup page explains overwrite, local-only export, operation states, and dangerous reset', () => {
  assert.match(page, /保存在本机/)
  assert.match(page, /不会上传或自动同步/)
  assert.match(page, /导入会完整替换当前数据/)
  assert.match(page, /正在导出备份/)
  assert.match(page, /正在读取已保存备份/)
  assert.match(page, /正在读取本地文件/)
  assert.match(page, /正在导入并校验/)
  assert.match(page, /应用内还没有已保存备份/)
  assert.match(page, /导入失败/)
  assert.match(page, /覆盖未完成；请重启核对当前数据/)
  assert.match(page, /需要连续确认三次/)
  assert.match(page, /内置文案模板、月卡文案模板和 5 个默认支出分类/)
  assert.match(page, /自定义支出分类/)
  assert.doesNotMatch(page, /checkbox-filled/)
  assert.doesNotMatch(page, /全部订单、收支与设置|只保留系统默认设置/)

  const importFlow = functionBody(page, 'doImport', 'pickFromSavedBackups')
  assert.match(importFlow, /if \(busy\.value\) return/)
  assert.ok(importFlow.indexOf("busyAction.value = 'import'") < importFlow.indexOf('confirmDialog('))

  const clearFlow = page.slice(page.indexOf('async function doClear'), page.indexOf('</script>'))
  assert.match(clearFlow, /if \(busy\.value\) return/)
  assert.ok(clearFlow.indexOf("busyAction.value = 'clear'") < clearFlow.indexOf('confirmDialog('))
})

test('backup import checks schema and database integrity before committing', () => {
  assert.match(backup, /payload\.schema_version !== currentSchemaVersion/)
  assert.match(backup, /PRAGMA integrity_check\(1\)/)
  assert.match(backup, /PRAGMA foreign_key_check/)

  const importFlow = backup.slice(
    backup.indexOf('export async function importBackup'),
    backup.indexOf('export async function clearAllData'),
  )
  assert.match(importFlow, /assertDatabaseIntegrity/)
  assert.ok(importFlow.indexOf('await tx(') < importFlow.indexOf('await assertDatabaseIntegrity()'))
  assert.equal(importFlow.match(/await tx\(/g)?.length, 1)
  assert.match(database, /operation: 'rollback'/)
})

test('saved-backup listing distinguishes an empty directory from I/O failures', () => {
  const listFlow = backup.slice(
    backup.indexOf('export async function listBackupFiles'),
    backup.indexOf('export async function readBackupFile'),
  )
  assert.match(listFlow, /resolve\(files\)/)
  assert.match(listFlow, /reject\(new Error\('无法读取应用内备份目录'\)\)/)
  assert.match(listFlow, /reject\(new Error\('无法访问应用内备份目录'\)\)/)
  assert.doesNotMatch(listFlow, /\(\) => resolve\(\[\]\)/)
})

test('backup page uses the warm-paper risk hierarchy without cloud or demo data', () => {
  assert.match(tokens, /\$hej-color-canvas:\s*#f5f4ed/i)
  assert.match(tokens, /\$hej-color-surface:\s*#faf9f5/i)
  assert.match(tokens, /\$hej-color-accent:\s*#c96442/i)
  assert.match(page, /<style scoped lang="scss">/)
  assert.match(page, /\$hej-color-canvas/)
  assert.match(page, /\$hej-color-surface/)
  assert.match(page, /\$hej-color-accent/)
  assert.match(page, /\$hej-color-danger/)
  assert.match(page, /\$hej-color-border/)
  assert.doesNotMatch(page, /#007aff/i)
  assert.doesNotMatch(page, /#ee0a24/i)
  assert.doesNotMatch(page, /云备份|云同步/)
})

test('backup page retains native child-page navigation semantics', () => {
  const entry = pages.pages.find((item) => item.path === 'pages/me/settings/backup')
  assert.ok(entry)
  assert.equal(entry.style?.navigationBarTitleText, '备份恢复')
  assert.equal(entry.style?.navigationStyle, undefined)
})
