import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdirSync, writeFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {dirname, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const mediaProject = resolve(here, '..');
const repository = resolve(mediaProject, '..', '..');
const evidenceDirectory = resolve(mediaProject, 'public', 'evidence');
const generatedDirectory = resolve(mediaProject, 'src', 'generated');
mkdirSync(evidenceDirectory, {recursive: true});
mkdirSync(generatedDirectory, {recursive: true});

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

const fixturePages = new Map([
  ['/robots.txt', {type: 'text/plain; charset=utf-8', body: 'User-agent: *\nAllow: /\n'}],
  ['/', {
    type: 'text/html; charset=utf-8',
    body: '<!doctype html><html lang="en"><head><title>Offline Evidence Index</title><meta name="description" content="Deterministic loopback fixture"></head><body><main><h1>Offline Evidence Index</h1><p>Local fixture content for a real crawler workflow proof.</p><a href="/evidence">Evidence record</a></main></body></html>',
  }],
  ['/evidence', {
    type: 'text/html; charset=utf-8',
    body: '<!doctype html><html lang="en"><head><title>Bounded Evidence Record</title></head><body><article><h1>Bounded Evidence Record</h1><p>Cockroach Crawler reached this page through one explicit loopback authority and finite budgets.</p></article></body></html>',
  }],
]);

const server = createServer((request, response) => {
  const route = fixturePages.get(new URL(request.url ?? '/', 'http://fixture.invalid').pathname);
  if (!route) {
    response.writeHead(404, {'content-type': 'text/plain; charset=utf-8'});
    response.end('Not found');
    return;
  }
  response.writeHead(200, {
    'content-type': route.type,
    'cache-control': 'no-store',
    'x-fixture': 'cockroach-crawler-offline-proof',
  });
  response.end(route.body);
});

const listen = () => new Promise((resolveListen, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => resolveListen(server.address()));
});

const runChild = (args) => new Promise((resolveRun, reject) => {
  const child = spawn(process.execPath, args, {
    cwd: repository,
    env: cleanEnvironment,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  let stdout = '';
  let stderr = '';
  const timer = setTimeout(() => child.kill(), 20_000);
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk) => { stdout += chunk; });
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  child.once('error', reject);
  child.once('close', (code, signal) => {
    clearTimeout(timer);
    if (signal) {
      reject(new Error(`CLI was terminated by ${signal}.`));
      return;
    }
    resolveRun({code, stdout: stdout.replace(/\r\n/g, '\n'), stderr: stderr.replace(/\r\n/g, '\n')});
  });
});

const commandOptions = [
  '--allow-private-networks',
  '--max-pages', '2',
  '--max-depth', '1',
  '--max-requests', '6',
  '--max-bytes', '65536',
  '--max-total-bytes', '131072',
  '--delay', '0',
];

let address;
try {
  address = await listen();
  if (!address || typeof address === 'string') throw new Error('Loopback fixture did not expose a TCP address.');
  const seed = `http://127.0.0.1:${address.port}/`;
  const cliArgs = ['bin/cockroach-crawl.js', seed, ...commandOptions];
  const allowedRun = await runChild(cliArgs);
  if (allowedRun.code !== 0) throw new Error(`Allowed CLI proof failed: ${allowedRun.stderr.trim()}`);
  const allowedOutput = JSON.parse(allowedRun.stdout);
  if (!Array.isArray(allowedOutput.pages) || allowedOutput.pages.length !== 2) {
    throw new Error(`Allowed CLI proof returned ${allowedOutput.pages?.length ?? 'no'} pages instead of 2.`);
  }
  for (const page of allowedOutput.pages) {
    if (typeof page.contentHash !== 'string' || !/^sha256:[a-f0-9]{64}$/.test(page.contentHash)) {
      throw new Error('Allowed CLI proof returned a page without a SHA-256 content hash.');
    }
  }

  const deniedRun = await runChild(['bin/cockroach-crawl.js', seed, '--max-pages', '1', '--max-requests', '2', '--delay', '0']);
  const deniedOutput = deniedRun.stdout.trim() ? JSON.parse(deniedRun.stdout) : null;
  const deniedPageCount = Array.isArray(deniedOutput?.pages) ? deniedOutput.pages.length : 0;
  if (deniedRun.code === 0 || deniedPageCount !== 0) {
    throw new Error(`The credential-free, private-network-denied proof did not fail closed with zero pages. code=${deniedRun.code} stdout=${deniedRun.stdout.trim()} stderr=${deniedRun.stderr.trim()}`);
  }
  if (!/private|loopback|non-public/i.test(deniedRun.stderr)) {
    throw new Error('The denied proof did not report its private/loopback boundary.');
  }

  const {createSourceRegistry} = await import(pathToFileURL(resolve(repository, 'src', 'sources.js')).href);
  const registry = createSourceRegistry({
    web: {
      crawlOptions: {
        allowPrivateNetworks: true,
        maxPages: 2,
        maxDepth: 1,
        maxRequests: 6,
        maxBytes: 65_536,
        maxTotalBytes: 131_072,
        delayMs: 0,
      },
    },
  });
  const records = await registry.read('web', {target: seed, maxResults: 2});
  if (records.length !== 2 || records.some((record) => record.source !== 'web' || record.type !== 'web_page')) {
    throw new Error('Source registry did not return two normalized web_page records.');
  }
  if (records.some((record) => !/^sha256:[a-f0-9]{64}$/.test(record.contentHash))) {
    throw new Error('Source registry returned a record without a SHA-256 content hash.');
  }

  const command = `cockroach-crawl ${seed} ${commandOptions.join(' ')}`;
  const deniedCommand = `cockroach-crawl ${seed} --max-pages 1 --max-requests 2 --delay 0`;
  const normalized = records[0];
  const proof = {
    capturedAt: new Date().toISOString(),
    fixture: {
      mode: 'offline-loopback',
      authority: seed,
      externalNetworkRequests: 0,
      credentialsUsed: false,
      routes: [...fixturePages.keys()],
    },
    allowed: {
      command,
      exitCode: allowedRun.code,
      pageCount: allowedOutput.pages.length,
      stats: allowedOutput.stats,
      pages: allowedOutput.pages.map((page) => ({
        title: page.title,
        url: page.url,
        depth: page.depth,
        status: page.status,
        contentHash: page.contentHash,
      })),
    },
    denied: {
      command: deniedCommand,
      exitCode: deniedRun.code,
      pageCount: deniedPageCount,
      warning: deniedRun.stderr.trim(),
    },
    doctor: registry.doctor(),
    normalizedRecord: {
      source: normalized.source,
      id: normalized.id,
      type: normalized.type,
      title: normalized.title,
      url: normalized.url,
      contentHash: normalized.contentHash,
      adapterVersion: normalized.adapterVersion,
      warnings: normalized.warnings,
      metadata: normalized.metadata,
      provenance: normalized.provenance,
    },
  };

  const proofJson = `${JSON.stringify(proof, null, 2)}\n`;
  const rawAllowed = `${allowedRun.stdout.trimEnd()}\n`;
  const rawDenied = `${[deniedRun.stderr.trimEnd(), deniedRun.stdout.trimEnd()].filter(Boolean).join('\n')}\n`;
  const rawRecord = `${JSON.stringify(normalized, null, 2)}\n`;
  writeFileSync(resolve(generatedDirectory, 'workflow-evidence.json'), proofJson, 'utf8');
  writeFileSync(resolve(evidenceDirectory, 'workflow-cli-output.json'), rawAllowed, 'utf8');
  writeFileSync(resolve(evidenceDirectory, 'workflow-denied.txt'), rawDenied, 'utf8');
  writeFileSync(resolve(evidenceDirectory, 'workflow-normalized-record.json'), rawRecord, 'utf8');
  writeFileSync(resolve(evidenceDirectory, 'workflow-manifest.json'), `${JSON.stringify({
    capturedAt: proof.capturedAt,
    mode: proof.fixture.mode,
    files: {
      'workflow-cli-output.json': `sha256:${createHash('sha256').update(rawAllowed).digest('hex')}`,
      'workflow-denied.txt': `sha256:${createHash('sha256').update(rawDenied).digest('hex')}`,
      'workflow-normalized-record.json': `sha256:${createHash('sha256').update(rawRecord).digest('hex')}`,
    },
  }, null, 2)}\n`, 'utf8');

  console.log(`Captured real offline workflow: ${proof.allowed.pageCount} allowed pages, ${proof.denied.pageCount} denied pages, ${records.length} normalized records.`);
} finally {
  if (server.listening) {
    await new Promise((resolveClose, reject) => server.close((error) => error ? reject(error) : resolveClose()));
  }
}
