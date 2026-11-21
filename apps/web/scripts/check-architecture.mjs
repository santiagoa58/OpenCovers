import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const baselineFile = join(root, "scripts/architecture-baseline.json");
const sourceRoots = ["api", "mcp", "site", "web", "widget"].map((app) => join(root, "apps", app, "src"));
const lineLimits = { ".tsx": 250, ".ts": 600 };

function sourceFiles(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    if (!entry.isFile() || !/\.tsx?$/.test(path) || /\.(?:test|spec)\.tsx?$/.test(path)) return [];
    return [path];
  });
}

function inspect(path) {
  const content = readFileSync(path, "utf8");
  const jsx = path.endsWith(".tsx");
  const file = ts.createSourceFile(path, content, ts.ScriptTarget.Latest, true, jsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  let nestedTernaries = 0;
  const positions = [];
  function visit(node, ternaryDepth = 0) {
    if (ts.isConditionalExpression(node)) {
      if (ternaryDepth > 0) {
        nestedTernaries++;
        const pos = file.getLineAndCharacterOfPosition(node.getStart(file));
        positions.push(pos.line + 1);
      }
      visit(node.condition, ternaryDepth + 1);
      visit(node.whenTrue, ternaryDepth + 1);
      visit(node.whenFalse, ternaryDepth + 1);
      return;
    }
    ts.forEachChild(node, (child) => visit(child, 0));
  }
  visit(file);
  return {
    nestedTernaries,
    lines: content.split(/\r?\n/).length,
    lineLimit: lineLimits[jsx ? ".tsx" : ".ts"],
    positions,
  };
}

const files = sourceRoots.flatMap(sourceFiles);
const report = Object.fromEntries(files.map((file) => {
  const details = inspect(file);
  return [relative(root, file).replaceAll("\\", "/"), details];
}));

if (process.argv.includes("--snapshot")) {
  const snapshot = Object.fromEntries(Object.entries(report)
    .filter(([, item]) => item.nestedTernaries > 0 || item.lines > item.lineLimit)
    .map(([path, item]) => [path, {
      ...(item.nestedTernaries > 0 ? { nestedTernaries: item.nestedTernaries } : {}),
      ...(item.lines > item.lineLimit ? { lines: item.lines } : {}),
    }]));
  process.stdout.write(JSON.stringify(snapshot, null, 2) + "\n");
  process.exit(0);
}

const baseline = JSON.parse(readFileSync(baselineFile, "utf8"));
const errors = [];
for (const [path, current] of Object.entries(report)) {
  const allowed = baseline[path] ?? {};
  if (current.nestedTernaries > (allowed.nestedTernaries ?? 0)) {
    errors.push(`${path}: ${current.nestedTernaries} nested ternaries (allowed ${allowed.nestedTernaries ?? 0}), lines ${current.positions.join(", ")}`);
  }
  if (current.lines > current.lineLimit && current.lines > (allowed.lines ?? current.lineLimit)) {
    errors.push(`${path}: ${current.lines} lines (limit ${current.lineLimit}; legacy allowance ${allowed.lines ?? 0})`);
  }
}
if (errors.length > 0) {
  process.stderr.write("Architecture checks failed:\n" + errors.join("\n") + "\n");
  process.exitCode = 1;
} else {
  process.stdout.write(`Architecture checks passed across ${files.length} source modules. Existing debt cannot increase; new source files must meet size and nesting limits.\n`);
}
