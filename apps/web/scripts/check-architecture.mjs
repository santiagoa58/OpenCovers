import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

// TypeScript 7's native compiler does not expose the legacy JavaScript AST API.
// Vite's React plugin already brings Babel as a direct dependency.
const require = createRequire(import.meta.url);
const pluginRequire = createRequire(require.resolve("@vitejs/plugin-react"));
const { parseSync } = pluginRequire("@babel/core");

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
  const ast = parseSync(content, {
    filename: path,
    babelrc: false,
    configFile: false,
    parserOpts: {
      sourceType: "module",
      plugins: ["typescript", "jsx"],
    },
  });
  let nestedTernaries = 0;
  const positions = [];
  const nonAstKeys = new Set(["loc", "start", "end", "extra", "comments", "leadingComments", "trailingComments", "innerComments"]);
  function visit(node, ternaryDepth = 0) {
    if (!node || typeof node !== "object" || !node.type) return;
    const depth = node.type === "ConditionalExpression" ? ternaryDepth + 1 : ternaryDepth;
    if (node.type === "ConditionalExpression" && ternaryDepth > 0) {
      nestedTernaries++;
      positions.push(node.loc?.start.line ?? 0);
    }
    for (const [key, child] of Object.entries(node)) {
      if (nonAstKeys.has(key)) continue;
      if (Array.isArray(child)) {
        for (const part of child) visit(part, depth);
      } else {
        visit(child, depth);
      }
    }
  }
  visit(ast);
  return {
    nestedTernaries,
    lines: content.split(/\r?\n/).length,
    lineLimit: lineLimits[path.endsWith(".tsx") ? ".tsx" : ".ts"],
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
