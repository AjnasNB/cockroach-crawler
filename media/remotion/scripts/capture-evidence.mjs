import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const mediaProject = resolve(here, '..');
const repository = resolve(mediaProject, '..', '..');
const evidenceDirectory = resolve(mediaProject, 'public', 'evidence');
const generatedDirectory = resolve(mediaProject, 'src', 'generated');
mkdirSync(evidenceDirectory, {recursive: true});
mkdirSync(generatedDirectory, {recursive: true});

const clean = (value) => value
  .replace(/\u001b\[[0-9;]*m/g, '')
  .replace(/\r\n/g, '\n')
  .trimEnd();

const inheritedEnvironmentKeys = [
  'PATH', 'Path', 'SystemRoot', 'WINDIR', 'ComSpec', 'COMSPEC', 'PATHEXT',
  'TEMP', 'TMP', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA', 'ProgramFiles',
  'ProgramFiles(x86)', 'ProgramData', 'NUMBER_OF_PROCESSORS', 'PROCESSOR_ARCHITECTURE',
];
const cleanEnvironment = Object.fromEntries(
  inheritedEnvironmentKeys
    .filter((key) => typeof process.env[key] === 'string' && process.env[key].length > 0)
    .map((key) => [key, process.env[key]]),
);
Object.assign(cleanEnvironment, {CI: '1', NO_COLOR: '1', FORCE_COLOR: '0'});

const run = (command, args) => clean(execFileSync(command, args, {
  cwd: repository,
  encoding: 'utf8',
  env: cleanEnvironment,
  maxBuffer: 20 * 1024 * 1024,
}));

const doctor = run(process.execPath, ['bin/cockroach-sources.js', 'doctor']);
const help = run(process.execPath, ['bin/cockroach-crawl.js', '--help']);
const tests = process.platform === 'win32'
  ? run(process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', 'npm test'])
  : run('npm', ['test']);
const gitCommit = run('git', ['rev-parse', '--short=12', 'HEAD']);
const workingTreeDirty = run('git', ['status', '--porcelain']).length > 0;
const packageManifest = JSON.parse(readFileSync(resolve(repository, 'package.json'), 'utf8'));
const benchmarkPath = resolve(repository, 'bench', 'results', 'local-regression.json');
const benchmarkRaw = readFileSync(benchmarkPath, 'utf8');
const benchmarkResult = JSON.parse(benchmarkRaw);
if (!benchmarkResult.scope?.excludedClaims?.includes('industry or global standard')) {
  throw new Error('Local benchmark result is missing the industry/global-standard exclusion.');
}

const lines = tests.split('\n').map((line) => line.trim()).filter(Boolean);
const doctorLines = doctor.split('\n').filter(Boolean);
const expectedDoctorStates = new Map([
  ['web', 'ready'],
  ['github', 'ready'],
  ['youtube', 'partial'],
  ['x', 'missing_credentials'],
  ['reddit', 'missing_credentials'],
]);
for (const line of doctorLines) {
  const [provider, state] = line.trim().split(/\s+/, 3);
  if (expectedDoctorStates.get(provider) !== state) {
    throw new Error(`Unexpected credential-free doctor state for ${provider}: ${state}.`);
  }
  expectedDoctorStates.delete(provider);
}
if (expectedDoctorStates.size > 0) {
  throw new Error(`Missing doctor states: ${[...expectedDoctorStates.keys()].join(', ')}.`);
}
const findCount = (label) => {
  const line = lines.find((candidate) => candidate.startsWith(`ℹ ${label} `));
  if (!line) throw new Error(`Could not find ${label} in npm test output.`);
  return Number.parseFloat(line.slice(`ℹ ${label} `.length));
};

const wantedTests = [
  'crawler respects robots.txt',
  'per-response and total byte budgets',
  'Azure and other provider platform endpoints',
  'every redirect hop is origin-checked',
  'serverless redirect validation blocks',
  'X provider requires official bearer',
  'Reddit provider uses application-only OAuth',
];
const passedLines = lines.filter((line) => line.startsWith('✔'));
const testLines = wantedTests.map((needle) => {
  const line = passedLines.find((candidate) => candidate.includes(needle));
  if (!line) throw new Error(`Expected passing test was not found: ${needle}`);
  return line.replace(/ \([0-9.]+ms\)$/, '');
});

const evidence = {
  capturedAt: new Date().toISOString(),
  gitCommit,
  workingTreeDirty,
  revisionLabel: `${gitCommit}${workingTreeDirty ? ' + working tree' : ''}`,
  nodeVersion: process.version,
  packageName: packageManifest.name,
  packageVersion: packageManifest.version,
  doctorLines,
  helpLines: help.split('\n').filter(Boolean).slice(0, 18),
  testLines,
  testSummary: {
    tests: findCount('tests'),
    pass: findCount('pass'),
    fail: findCount('fail'),
    durationMs: findCount('duration_ms'),
  },
  benchmark: {
    name: benchmarkResult.benchmark,
    generatedAt: benchmarkResult.generatedAt,
    pages: benchmarkResult.configuration.pages,
    measuredRuns: benchmarkResult.configuration.measuredRuns,
    correctness: benchmarkResult.correctness.status,
    medianPagesPerSecond: benchmarkResult.results.pagesPerSecond.median,
    disclaimer: 'Project-local 120-page regression fixture; not an industry or global benchmark.',
  },
};

const rawFiles = {
  'doctor.txt': `${doctor}\n`,
  'cli-help.txt': `${help}\n`,
  'npm-test.txt': `${tests}\n`,
  'local-regression.json': benchmarkRaw.endsWith('\n') ? benchmarkRaw : `${benchmarkRaw}\n`,
};
for (const [name, contents] of Object.entries(rawFiles)) {
  writeFileSync(resolve(evidenceDirectory, name), contents, 'utf8');
}

const evidenceJson = `${JSON.stringify(evidence, null, 2)}\n`;
writeFileSync(resolve(generatedDirectory, 'evidence.json'), evidenceJson, 'utf8');
writeFileSync(resolve(evidenceDirectory, 'manifest.json'), `${JSON.stringify({
  capturedAt: evidence.capturedAt,
  gitCommit,
  workingTreeDirty,
  files: Object.fromEntries(Object.entries(rawFiles).map(([name, contents]) => [
    name,
    `sha256:${createHash('sha256').update(contents).digest('hex')}`,
  ])),
}, null, 2)}\n`, 'utf8');

console.log(`Captured ${evidence.testSummary.pass}/${evidence.testSummary.tests} passing tests and ${evidence.doctorLines.length} provider states from ${gitCommit}.`);
