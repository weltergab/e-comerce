import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const requiredSuites = JSON.parse(readFileSync(new URL('./required-test-suites.json', import.meta.url), 'utf8'));

export function validateReports(directory, mandatoryFiles = requiredSuites[basename(directory)] || []) {
  const json = JSON.parse(readFileSync(resolve(directory, 'reports/tests.json'), 'utf8'));
  const xml = readFileSync(resolve(directory, 'reports/junit.xml'), 'utf8');
  const required = [];
  function discover(folder) {
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      if (['node_modules', 'reports', 'dist', '.git'].includes(entry.name)) continue;
      const file = resolve(folder, entry.name);
      if (entry.isDirectory()) discover(file);
      else if (/\.(test|spec)\.[cm]?[jt]sx?$/.test(entry.name)) required.push(relative(directory, file).replaceAll('\\', '/'));
    }
  }
  discover(directory);
  for (const file of mandatoryFiles) {
    if (!required.includes(file)) throw new Error(`G3: suíte obrigatória removida: ${file}`);
  }
  if (!required.length || !json.success || !json.numTotalTests || json.numFailedTests || json.numPendingTests || json.numTodoTests) {
    throw new Error('G3: suíte ausente, falha ou teste obrigatório não executado.');
  }
  const assertions = json.testResults.flatMap(result => result.assertionResults);
  if (assertions.length !== json.numTotalTests || assertions.some(test => test.status !== 'passed')) throw new Error('G3: contagem/status JSON inconsistente.');
  for (const file of required) {
    const suite = json.testResults.find(result => result.name.replaceAll('\\', '/').endsWith('/' + file));
    if (!suite || suite.status !== 'passed' || !suite.assertionResults.length) throw new Error(`G3: arquivo obrigatório ausente: ${file}`);
  }
  const root = xml.match(/<testsuites\s[^>]*>/)?.[0];
  if (!root || !root.includes(`tests="${json.numTotalTests}"`) || !/failures="0"/.test(root) || !/errors="0"/.test(root) || !xml.includes('</testsuites>')) {
    throw new Error('G3: JUnit ausente ou inconsistente com JSON.');
  }
  return { tests: json.numTotalTests, files: required.length, failed: json.numFailedTests, skipped: json.numPendingTests };
}

export function qualityDecision(results) {
  return ['backend', 'frontend'].every(name => results[name]?.result === 'success');
}

function command(executable, args) {
  // Windows não executa npm.cmd diretamente sem shell; use o CLI JavaScript.
  if (process.platform === 'win32' && executable === 'npm') {
    const cli = process.env.npm_execpath || resolve(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
    if (!existsSync(cli)) throw new Error('CLI npm não localizado ao lado do runtime Node.');
    return spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
  }
  return spawnSync(executable, args, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
}

function run(label, executable, ...args) {
  if (!/^[a-z-]+$/.test(label)) throw new Error('Identificador de etapa inválido.');
  mkdirSync('reports', { recursive: true });
  const start = new Date();
  const result = command(executable, args);
  const end = new Date();
  const output = (result.stdout || '') + (result.stderr || '') + (result.error?.message || '');
  process.stdout.write(output);
  writeFileSync(`reports/${label}.log`, output);
  if (label.startsWith('audit-')) writeFileSync(`reports/${label}.json`, result.stdout || '{}');
  const exitCode = result.status ?? 1;
  writeFileSync(`reports/${label}-step.json`, JSON.stringify({ command: [executable, ...args].join(' '), start: start.toISOString(), end: end.toISOString(), durationSeconds: (end - start) / 1000, exitCode, status: exitCode === 0 ? 'success' : 'failure' }, null, 2));
  process.exitCode = exitCode;
}

function finalize() {
  mkdirSync('reports', { recursive: true });
  const steps = JSON.parse(process.env.STEP_RESULTS || '{}');
  const labels = ['install', 'build', ...(basename(process.cwd()) === 'frontend_ecomerce' ? ['lint'] : []), 'tests', 'audit-production', 'audit-full', 'reports'];
  const stages = Object.fromEntries(labels.map(label => {
    const file = `reports/${label}-step.json`;
    const status = steps[label]?.outcome || 'not-executed';
    return [label, existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : { status, reason: status === 'success' ? 'Etapa concluída pelo workflow.' : 'Consultar pré-requisitos, cancelamento ou logs do job.' }];
  }));
  const checkout = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout?.trim();
  let counts;
  try { counts = validateReports(process.cwd()); } catch (error) { counts = { diagnostic: error.message }; }
  const manifest = {
    project: basename(process.cwd()), event: process.env.GITHUB_EVENT_NAME || 'local', branch: process.env.HEAD_BRANCH || process.env.GITHUB_REF_NAME || 'local',
    headSha: process.env.HEAD_SHA || checkout, testedSha: checkout, runId: process.env.GITHUB_RUN_ID || null, attempt: process.env.GITHUB_RUN_ATTEMPT || null,
    generatedAt: new Date().toISOString(), node: process.version, npm: command('npm', ['--version']).stdout?.trim(),
    stages, tests: counts,
  };
  writeFileSync('reports/manifest.json', JSON.stringify(manifest, null, 2));
  const summary = [`### ${manifest.project}`, `Head: ${manifest.headSha}`, `Checkout testado: ${manifest.testedSha}`, '', '| Etapa | Resultado |', '| --- | --- |', ...Object.entries(stages).map(([key, value]) => `| ${key} | ${value.status} |`), '', `Testes: ${JSON.stringify(counts)}`, 'Relatórios preservados no artefato desta execução por 90 dias.'].join('\n');
  writeFileSync('reports/summary.md', summary);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary + '\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [action, ...args] = process.argv.slice(2);
  if (action === 'run') run(...args);
  else if (action === 'verify') console.log(validateReports(process.cwd()));
  else if (action === 'finalize') finalize();
  else if (action === 'decide') {
    const success = qualityDecision(JSON.parse(process.env.JOB_RESULTS || '{}'));
    console.log(success ? 'APROVADO: ambos os projetos e seus artefatos concluídos.' : 'REPROVADO: failure, cancelled, skipped ou resultado ausente impede aprovação.');
    process.exitCode = success ? 0 : 1;
  } else throw new Error('Comando CI desconhecido.');
}
