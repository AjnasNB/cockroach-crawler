import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const packageJson = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const lockfile = JSON.parse(await readFile(join(root, 'package-lock.json'), 'utf8'));
const allowedLicenses = new Set(['MIT', 'Apache-2.0']);
const direct = new Map();

for (const [section, label] of [
  ['dependencies', 'runtime'],
  ['peerDependencies', 'peer'],
  ['devDependencies', 'development'],
]) {
  for (const name of Object.keys(packageJson[section] ?? {})) {
    const record = direct.get(name) ?? { name, scopes: [] };
    record.scopes.push(label);
    direct.set(name, record);
  }
}

const rows = [];
const errors = [];

for (const record of [...direct.values()].sort((a, b) => a.name.localeCompare(b.name))) {
  const installedPath = join(root, 'node_modules', ...record.name.split('/'), 'package.json');
  const lockPath = `node_modules/${record.name}`;

  let installed;
  try {
    installed = JSON.parse(await readFile(installedPath, 'utf8'));
  } catch (error) {
    errors.push(`${record.name}: installed manifest is unavailable (${error.code ?? error.message})`);
    continue;
  }

  const locked = lockfile.packages?.[lockPath];
  if (!locked) {
    errors.push(`${record.name}: package-lock.json has no ${lockPath} entry`);
    continue;
  }

  const installedLicense = installed.license;
  const lockedLicense = locked.license;
  if (installed.version !== locked.version) {
    errors.push(`${record.name}: installed ${installed.version} differs from locked ${locked.version}`);
  }
  if (installedLicense !== lockedLicense) {
    errors.push(
      `${record.name}: installed license ${JSON.stringify(installedLicense)} differs from locked ${JSON.stringify(lockedLicense)}`,
    );
  }
  if (!allowedLicenses.has(installedLicense)) {
    errors.push(`${record.name}: unreviewed direct license ${JSON.stringify(installedLicense)}`);
  }

  rows.push({
    name: record.name,
    version: installed.version,
    license: installedLicense,
    scope: record.scopes.join(', '),
  });
}

console.log('Direct dependency license audit');
console.log('package\tversion\tlicense\tscope');
for (const row of rows) {
  console.log(`${row.name}\t${row.version}\t${row.license}\t${row.scope}`);
}

if (errors.length > 0) {
  console.error('\nLicense audit failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(`\nVerified ${rows.length} direct packages against package-lock.json.`);
}
