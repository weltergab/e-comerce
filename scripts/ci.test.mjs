import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { qualityDecision, validateReports } from './ci.mjs';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

function cleanup(directory) {
  assert.equal(dirname(resolve(directory)), resolve(tmpdir()));
  assert.match(basename(directory), /^lerium-(exit|ci)-/);
  rmSync(directory, { recursive: true, force: true });
}

test('comando obrigatório preserva exit code, logs e diagnóstico após falha', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lerium-exit-'));
  try {
    writeFileSync(join(dir, 'fail.mjs'), "console.error('falha controlada'); process.exit(7);");
    const result = spawnSync(process.execPath, [fileURLToPath(new URL('./ci.mjs', import.meta.url)), 'run', 'build', process.execPath, 'fail.mjs'], { cwd: dir });
    assert.equal(result.status, 7);
    assert.equal(JSON.parse(readFileSync(join(dir, 'reports/build-step.json'))).exitCode, 7);
    assert.match(readFileSync(join(dir, 'reports/build.log'), 'utf8'), /falha controlada/);
  } finally { cleanup(dir); }
});

test('agregador exige os dois jobs e rejeita falha, cancelamento, skip e ausência', () => {
  assert.equal(qualityDecision({ backend: { result: 'success' }, frontend: { result: 'success' } }), true);
  for (const result of ['failure', 'cancelled', 'skipped', undefined]) {
    assert.equal(qualityDecision({ backend: { result }, frontend: { result: 'success' } }), false);
    assert.equal(qualityDecision({ frontend: { result }, backend: { result: 'success' } }), false);
  }
});

test('relatórios exigem todas as suítes, JUnit coerente e nenhum caso ignorado', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lerium-ci-'));
  try {
    mkdirSync(join(dir, 'reports'));
    writeFileSync(join(dir, 'business.test.ts'), '');
    const data = { success: true, numTotalTests: 1, numFailedTests: 0, numPendingTests: 0, testResults: [{ name: join(dir, 'business.test.ts'), status: 'passed', assertionResults: [{ status: 'passed' }] }] };
    const save = () => writeFileSync(join(dir, 'reports/tests.json'), JSON.stringify(data));
    save();
    assert.throws(() => validateReports(dir));
    writeFileSync(join(dir, 'reports/junit.xml'), '<testsuites tests="1" failures="0" errors="0"></testsuites>');
    assert.equal(validateReports(dir).tests, 1);
    assert.throws(() => validateReports(dir, ['integration-sql.test.ts']), /suíte obrigatória removida/);
    data.numPendingTests = 1; save();
    assert.throws(() => validateReports(dir), /G3/);
    data.numPendingTests = 0; save();
    writeFileSync(join(dir, 'missing.test.ts'), '');
    assert.throws(() => validateReports(dir), /arquivo obrigatório ausente/);
  } finally { cleanup(dir); }
});
