#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const APPROVED = new Set(["inter", "space grotesk", "jetbrains mono"]);
const FALLBACKS = new Set([
  "system-ui",
  "-apple-system",
  "blinkmacsystemfont",
  "segoe ui",
  "roboto",
  "sans-serif",
  "monospace",
  "ui-monospace",
  "ui-sans-serif",
  "inherit",
  "initial",
  "unset",
  "revert",
  "revert-layer"
]);
const EXTENSIONS = new Set([
  ".css", ".scss", ".sass", ".less", ".html", ".htm", ".svg",
  ".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx", ".json"
]);
const ROOTS = ["src", "mobile/src", "public", "mobile/public", "scripts"];
const ENTRY_FILES = ["index.html", "mobile/index.html"];
const ALLOWED_WEIGHTS = new Set(["400", "500", "600", "700"]);
const violations = [];
let scannedFiles = 0;

function blankComments(source, pattern) {
  return source.replace(pattern, (match) => match.replace(/[^\n]/g, " "));
}

function stripComments(source) {
  let clean = blankComments(source, /<!--[\s\S]*?-->/g);
  clean = blankComments(clean, /\/\*[\s\S]*?\*\//g);
  return clean;
}

function lineNumberAt(source, index) {
  return source.slice(0, index).split("\n").length;
}

function normalizeFamily(value) {
  return value
    .trim()
    .replace(/^["']+/, "")
    .replace(/["')]+$/, "")
    .trim()
    .toLowerCase();
}

function checkFontStack(file, original, value, index) {
  const line = lineNumberAt(original, index);
  for (const part of value.split(",")) {
    const family = normalizeFamily(part);
    if (!family || family.startsWith("var(") || family.startsWith("env(")) continue;
    if (APPROVED.has(family) || FALLBACKS.has(family)) continue;
    violations.push({
      file,
      line,
      message: 'unapproved font family "' + family + '" in "' + value.trim() +
        '"; use Inter, Space Grotesk, or JetBrains Mono'
    });
  }
}

function inspectGoogleFonts(file, original) {
  const urlPattern = /https?:\/\/fonts\.googleapis\.com\/css2?\?[^"'\s)]+/gi;
  for (const match of original.matchAll(urlPattern)) {
    const query = match[0].replace(/&amp;/g, "&").split("?")[1] || "";
    const params = new URLSearchParams(query);
    for (const spec of params.getAll("family")) {
      const familyName = spec.split(":")[0].trim().toLowerCase();
      const line = lineNumberAt(original, match.index ?? 0);
      if (!APPROVED.has(familyName)) {
        violations.push({
          file,
          line,
          message: 'Google Fonts request includes unapproved family "' + familyName + '"'
        });
      }
      const weightIndex = spec.toLowerCase().indexOf("wght@");
      if (weightIndex >= 0) {
        const weights = spec.slice(weightIndex + 5).match(/\d{3}/g) || [];
        for (const weight of weights) {
          if (!ALLOWED_WEIGHTS.has(weight)) {
            violations.push({
              file,
              line,
              message: 'Google Fonts request includes unapproved weight "' + weight +
                '" for "' + familyName + '"'
            });
          }
        }
      }
    }
  }
}

function inspectFile(relativePath) {
  const absolutePath = path.join(ROOT, relativePath);
  const original = fs.readFileSync(absolutePath, "utf8");
  const clean = stripComments(original);
  scannedFiles += 1;

  const patterns = [
    /font-family\s*:\s*([^;}]+)/gi,
    /font-family\s*=\s*"([^"]+)"/gi,
    /fontFamily\s*=\s*"([^"]+)"/g,
    /fontFamily\s*:\s*"([^"]+)"/g,
    /fontFamily\s*:\s*'([^']+)'/g
  ];

  for (const pattern of patterns) {
    for (const match of clean.matchAll(pattern)) {
      checkFontStack(relativePath, original, match[1], match.index ?? 0);
    }
  }

  inspectGoogleFonts(relativePath, original);

  const tokenPattern = /--pulse-font-(sans|display|mono)\s*:\s*([^;]+)/g;
  for (const match of clean.matchAll(tokenPattern)) {
    const expected = match[1] === "sans"
      ? "inter"
      : match[1] === "display"
        ? "space grotesk"
        : "jetbrains mono";
    if (!match[2].toLowerCase().includes(expected)) {
      violations.push({
        file: relativePath,
        line: lineNumberAt(original, match.index ?? 0),
        message: "--pulse-font-" + match[1] + " must use " + expected
      });
    }
  }
}

function walk(relativeDirectory) {
  const absoluteDirectory = path.join(ROOT, relativeDirectory);
  if (!fs.existsSync(absoluteDirectory)) {
    violations.push({
      file: relativeDirectory,
      line: 1,
      message: "required typography audit directory is missing"
    });
    return;
  }

  for (const entry of fs.readdirSync(absoluteDirectory, { withFileTypes: true })) {
    const relativePath = path.posix.join(
      relativeDirectory.replaceAll(path.sep, "/"),
      entry.name
    );

    if (entry.isDirectory()) {
      if (["node_modules", ".git", "dist", ".vercel", "coverage"].includes(entry.name)) continue;
      walk(relativePath);
    } else if (entry.isFile() && EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      inspectFile(relativePath);
    }
  }
}

for (const directory of ROOTS) walk(directory);

for (const file of ENTRY_FILES) {
  if (!fs.existsSync(path.join(ROOT, file))) {
    violations.push({ file, line: 1, message: "required application entry file is missing" });
  } else {
    inspectFile(file);
  }
}

// Both responsive entry points must request all approved families.
for (const file of ENTRY_FILES) {
  const content = fs.existsSync(path.join(ROOT, file))
    ? fs.readFileSync(path.join(ROOT, file), "utf8").replace(/\+/g, " ")
    : "";
  for (const family of APPROVED) {
    if (!content.toLowerCase().includes("family=" + family)) {
      violations.push({
        file,
        line: 1,
        message: 'entry point does not load required family "' + family + '"'
      });
    }
  }
}

// Validate the canonical tokens and the CSS aliases used by both applications.
const tokenCssFile = "src/brand/tokens.css";
const tokenCssPath = path.join(ROOT, tokenCssFile);
if (fs.existsSync(tokenCssPath)) {
  const tokens = fs.readFileSync(tokenCssPath, "utf8");
  const required = [
    [/--pulse-font-sans\s*:\s*['"]?Inter\b/i, "--pulse-font-sans must use Inter"],
    [/--pulse-font-display\s*:\s*['"]?Space Grotesk\b/i, "--pulse-font-display must use Space Grotesk"],
    [/--pulse-font-mono\s*:\s*['"]?JetBrains Mono\b/i, "--pulse-font-mono must use JetBrains Mono"],
    [/--pulse-font-body\s*:\s*var\(--pulse-font-sans\)/i, "--pulse-font-body must alias --pulse-font-sans"],
    [/--pulse-font-heading\s*:\s*var\(--pulse-font-display\)/i, "--pulse-font-heading must alias --pulse-font-display"]
  ];
  for (const [pattern, message] of required) {
    if (!pattern.test(tokens)) violations.push({ file: tokenCssFile, line: 1, message });
  }
}

for (const file of ["src/index.css", "mobile/src/index.css"]) {
  const absolutePath = path.join(ROOT, file);
  if (!fs.existsSync(absolutePath)) continue;
  const css = fs.readFileSync(absolutePath, "utf8");
  const requiredBlocks = [
    [/html\s*,\s*body\s*\{[^}]*font-family\s*:\s*var\(--pulse-font-sans/i, "html/body must use the shared sans token"],
    [/\.font-heading\s*\{[^}]*font-family\s*:\s*var\(--pulse-font-heading/i, ".font-heading must use the shared heading token"],
    [/\.font-sans\s*\{[^}]*font-family\s*:\s*var\(--pulse-font-body/i, ".font-sans must use the shared body token"],
    [/\.font-mono\s*\{[^}]*font-family\s*:\s*var\(--pulse-font-mono/i, ".font-mono must use the shared mono token"]
  ];
  for (const [pattern, message] of requiredBlocks) {
    if (!pattern.test(css)) violations.push({ file, line: 1, message });
  }
}

const mobileCssPath = path.join(ROOT, "mobile/src/index.css");
if (fs.existsSync(mobileCssPath)) {
  const mobileCss = fs.readFileSync(mobileCssPath, "utf8");
  if (!mobileCss.includes('@import "../../src/brand/tokens.css";')) {
    violations.push({
      file: "mobile/src/index.css",
      line: 1,
      message: "mobile must import the shared PULSE brand typography tokens"
    });
  }
}

// Preserve JSON-token parity with the CSS source of truth.
const tokenJsonFile = "src/brand/tokens.json";
try {
  const json = JSON.parse(fs.readFileSync(path.join(ROOT, tokenJsonFile), "utf8"));
  const families = json?.typography?.fontFamily || {};
  const expected = {
    sans: "Inter",
    display: "Space Grotesk",
    mono: "JetBrains Mono"
  };
  for (const role of Object.keys(expected)) {
    if (typeof families[role] !== "string" ||
        !families[role].toLowerCase().startsWith(expected[role].toLowerCase())) {
      violations.push({
        file: tokenJsonFile,
        line: 1,
        message: 'typography.fontFamily.' + role + " must start with " + expected[role]
      });
    }
  }
} catch (error) {
  violations.push({
    file: tokenJsonFile,
    line: 1,
    message: "could not parse typography token JSON: " + error.message
  });
}

if (violations.length > 0) {
  for (const item of violations) {
    process.stderr.write("[typography] " + item.file + ":" + item.line + " " + item.message + "\n");
  }
  process.stderr.write(
    "Typography audit failed: " + violations.length +
    " violation(s) across " + scannedFiles + " scanned files.\n"
  );
  process.exitCode = 1;
} else {
  process.stdout.write(
    "Typography audit passed: " + scannedFiles +
    " files scanned; only Inter, Space Grotesk, and JetBrains Mono are approved.\n"
  );
}
