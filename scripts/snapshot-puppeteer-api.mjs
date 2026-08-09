import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

function usage() {
  return "Usage: node scripts/snapshot-puppeteer-api.mjs <types.d.ts> <output.json> [typescript.js]";
}

function declarationName(node, sourceFile) {
  if (!node.name) return null;
  return node.name.getText(sourceFile).replace(/^['"]|['"]$/gu, "");
}

function isExported(node) {
  return Boolean(node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword));
}

function memberKind(member) {
  if (ts.isMethodDeclaration(member) || ts.isMethodSignature(member)) return "method";
  if (ts.isPropertyDeclaration(member) || ts.isPropertySignature(member)) return "property";
  if (ts.isGetAccessorDeclaration(member)) return "getter";
  if (ts.isSetAccessorDeclaration(member)) return "setter";
  if (ts.isConstructSignatureDeclaration(member) || ts.isConstructorDeclaration(member)) return "constructor";
  if (ts.isCallSignatureDeclaration(member)) return "call";
  if (ts.isIndexSignatureDeclaration(member)) return "index";
  return ts.SyntaxKind[member.kind] ?? "unknown";
}

function memberName(member, sourceFile) {
  if (ts.isConstructorDeclaration(member) || ts.isConstructSignatureDeclaration(member)) return "constructor";
  if (ts.isCallSignatureDeclaration(member)) return "call";
  if (ts.isIndexSignatureDeclaration(member)) return "index";
  return declarationName(member, sourceFile);
}

function publicMembers(node, sourceFile) {
  if (!(ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node))) return [];
  const seen = new Set();
  const members = [];
  for (const member of node.members) {
    if (member.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.PrivateKeyword)) continue;
    const name = memberName(member, sourceFile);
    if (!name || name.startsWith("#")) continue;
    const isStatic = Boolean(member.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.StaticKeyword));
    const kind = memberKind(member);
    const id = `${isStatic ? "static " : ""}${name}`;
    if (seen.has(`${kind}:${id}`)) continue;
    seen.add(`${kind}:${id}`);
    members.push({
      id,
      name,
      kind,
      static: isStatic,
      optional: Boolean(member.questionToken),
      deprecated: /@deprecated\b/u.test(member.getFullText(sourceFile))
    });
  }
  const counts = new Map();
  for (const member of members) counts.set(member.id, (counts.get(member.id) ?? 0) + 1);
  return members.map((member) => counts.get(member.id) > 1
    ? { ...member, id: `${member.id}#${member.kind}` }
    : member
  ).sort((left, right) => left.id.localeCompare(right.id) || left.kind.localeCompare(right.kind));
}

const [, , inputArg, outputArg, typescriptArg] = process.argv;
if (!inputArg || !outputArg) throw new Error(usage());

const typescriptModule = typescriptArg
  ? await import(pathToFileURL(path.resolve(typescriptArg)).href)
  : await import("typescript");
const ts = typescriptModule.default ?? typescriptModule;
if (!ts.ScriptTarget || typeof ts.createSourceFile !== "function") {
  throw new Error("This snapshot tool requires the TypeScript 5 compiler API; pass its lib/typescript.js path explicitly.");
}

const input = path.resolve(inputArg);
const output = path.resolve(outputArg);
const source = await readFile(input, "utf8");
const sourceFile = ts.createSourceFile(input, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const declarations = [];

for (const node of sourceFile.statements) {
  if (!isExported(node)) continue;
  if (ts.isVariableStatement(node)) {
    for (const declaration of node.declarationList.declarations) {
      const name = declarationName(declaration, sourceFile);
      if (name) declarations.push({ name, kind: "const", members: [] });
    }
    continue;
  }
  const name = declarationName(node, sourceFile);
  if (!name) continue;
  let kind = null;
  if (ts.isClassDeclaration(node)) kind = "class";
  else if (ts.isInterfaceDeclaration(node)) kind = "interface";
  else if (ts.isFunctionDeclaration(node)) kind = "function";
  else if (ts.isEnumDeclaration(node)) kind = "enum";
  else if (ts.isTypeAliasDeclaration(node)) kind = "type";
  if (!kind) continue;
  declarations.push({
    name,
    kind,
    members: publicMembers(node, sourceFile)
  });
}

const publicClasses = declarations.filter((entry) => entry.kind === "class");
const publicInterfaces = declarations.filter((entry) => entry.kind === "interface");
const snapshot = {
  schemaVersion: "cockroach.upstream-api-snapshot.v1",
  upstream: {
    name: "puppeteer-core",
    version: "25.5.0",
    license: "Apache-2.0",
    node: ">=22.12.0",
    npmIntegrity: "sha512-XPNT0dQJtphqQ4I29zxlG4IIPbg1iEHAQKWuQgtMJGXjACV77pZSmJvDi51IIIfd+DTKICcopJwUx4upVQ4XbA==",
    npmShasum: "a41b14d582056b998e0bc3561ac47c7615d38a53",
    tarballSha256: "52b57c652a24d69b2cc659888fcce97e26d91af17f46cc58920ada7d0998bdbd",
    types: "lib/types.d.ts",
    source: "https://github.com/puppeteer/puppeteer/tree/puppeteer-v25.5.0",
    docs: "https://pptr.dev/api"
  },
  counts: {
    declarations: declarations.length,
    classes: publicClasses.length,
    interfaces: publicInterfaces.length,
    classMembers: publicClasses.reduce((count, entry) => count + entry.members.length, 0),
    interfaceMembers: publicInterfaces.reduce((count, entry) => count + entry.members.length, 0)
  },
  declarations: declarations.sort((left, right) => left.name.localeCompare(right.name) || left.kind.localeCompare(right.kind))
};

await writeFile(output, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
console.log(JSON.stringify(snapshot.counts));
