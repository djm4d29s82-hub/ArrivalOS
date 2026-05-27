#!/usr/bin/env node
/**
 * ARRIVAL OS — Architecture Linter
 *
 * Enforces the write-boundary architecture without requiring ESLint.
 * Run: node scripts/check-architecture.js
 * CI:  add to package.json "check:arch": "node scripts/check-architecture.js"
 *
 * Rules enforced:
 *   RULE-01  No direct Mission.update() outside src/api/ and src/lib/
 *   RULE-02  No direct Mission.create() outside src/api/ and src/lib/
 *   RULE-03  No import of deprecated missionEngine.js outside allowed files
 *   RULE-04  Async state machine functions must not be called directly from pages/
 *            (they must go through src/api/missionWriteApi)
 *   RULE-05  envGuard.validateEnv() must be called in main.jsx
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'src');

// ---------------------------------------------------------------------------
// Legacy exceptions — known violations pending migration.
// Each entry suppresses ONE rule for ONE file. Entries are logged as warnings,
// not errors, so the build stays green while the debt is visible.
//
// HOW TO CLEAR: fix the violation in the listed file, then delete the entry.
// ---------------------------------------------------------------------------
const LEGACY_EXCEPTIONS = [];

function isLegacyException(violation) {
  return LEGACY_EXCEPTIONS.some(
    (e) => violation.file.replace(/\\/g, '/').endsWith(e.file) && e.rule === violation.rule
  );
}

// ---------------------------------------------------------------------------
// File walker
// ---------------------------------------------------------------------------
function walkFiles(dir, exts = ['.js', '.jsx', '.ts', '.tsx']) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory() && entry !== 'node_modules' && entry !== 'dist') {
      results.push(...walkFiles(full, exts));
    } else if (stat.isFile() && exts.includes(extname(entry))) {
      results.push(full);
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function rel(p) { return relative(ROOT, p); }

function lines(content) { return content.split('\n'); }

function check(file, content, pattern, rule, message) {
  const hits = [];
  lines(content).forEach((line, i) => {
    if (pattern.test(line)) hits.push({ line: i + 1, text: line.trim() });
  });
  return hits.map(h => ({ file: rel(file), rule, line: h.line, text: h.text, message }));
}

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------
const violations = [];

const FILES = walkFiles(SRC);

for (const file of FILES) {
  const content = readFileSync(file, 'utf-8');
  const relPath = rel(file).replace(/\\/g, '/');

  // ── RULE-01: no direct Mission.update() outside api/ and lib/ ────────────
  const isAllowedWriteFile =
    relPath.includes('src/api/') ||
    relPath.includes('src/lib/');

  if (!isAllowedWriteFile) {
    violations.push(...check(
      file, content,
      /entities\.Mission\.update\s*\(/,
      'RULE-01',
      'Direct Mission.update() detected. Use transitionMission() from @/api instead.'
    ));
  }

  // ── RULE-02: no direct Mission.create() outside api/ and lib/ ────────────
  if (!isAllowedWriteFile) {
    violations.push(...check(
      file, content,
      /entities\.Mission\.create\s*\(/,
      'RULE-02',
      'Direct Mission.create() detected. Use createMission() from @/api instead.'
    ));
  }

  // ── RULE-03: no import of deprecated missionEngine.js ────────────────────
  // Allowed in: missionEngine itself, src/api/ (approved gateway), AdminMissionDetail (legacy)
  const allowedEngineFiles = [
    'src/lib/missionEngine.js',
    'src/api/',
    'src/pages/admin/AdminMissionDetail.jsx',  // pending migration
  ];
  const normalRel = relPath.replace(/\\/g, '/');
  const isAllowedEngineFile = allowedEngineFiles.some(a =>
    a.endsWith('/') ? normalRel.includes(a) : normalRel.endsWith(a)
  );

  if (!isAllowedEngineFile) {
    violations.push(...check(
      file, content,
      /from\s+['"].*missionEngine['"]/,
      'RULE-03',
      'Import from deprecated missionEngine.js detected. Migrate to @/api or missionStateMachine.'
    ));
  }

  // ── RULE-04: async state machine functions must not be called from pages/ ─
  // They must go through missionWriteApi (which enforces permission checks)
  const isPageFile = relPath.includes('src/pages/');
  if (isPageFile) {
    const dangerousAsyncFns = [
      /transitionMissionStateAsync\s*\(/,
      /assignGreeterAsync\s*\(/,
      /reportMissionIssueAsync\s*\(/,
      /createMissionFromArrival\s*\(/,
    ];
    for (const pattern of dangerousAsyncFns) {
      violations.push(...check(
        file, content,
        pattern,
        'RULE-04',
        `Direct state machine async function call in page. Import from @/api and pass role: to get permission checks.`
      ));
    }
  }
}

// ── RULE-05: validateEnv() must be called in main.jsx ─────────────────────
const mainPath = join(SRC, 'main.jsx');
try {
  const mainContent = readFileSync(mainPath, 'utf-8');
  if (!mainContent.includes('validateEnv()')) {
    violations.push({
      file: rel(mainPath),
      rule: 'RULE-05',
      line: 1,
      text: '(not found)',
      message: 'validateEnv() must be called in main.jsx before ReactDOM.createRoot.',
    });
  }
} catch {
  violations.push({
    file: 'src/main.jsx',
    rule: 'RULE-05',
    line: 0,
    text: '(file not found)',
    message: 'main.jsx not found — cannot verify validateEnv() call.',
  });
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
const newViolations    = violations.filter(v => !isLegacyException(v));
const legacyViolations = violations.filter(v =>  isLegacyException(v));

// Show legacy tech-debt warnings (non-blocking)
if (legacyViolations.length > 0) {
  console.warn(`\x1b[33m⚠\x1b[0m  ${legacyViolations.length} legacy violation(s) pending migration (not blocking):`);
  for (const v of legacyViolations) {
    const ex = LEGACY_EXCEPTIONS.find(e => v.file.replace(/\\/g, '/').endsWith(e.file) && e.rule === v.rule);
    console.warn(`     \x1b[2m${v.file}  ${v.rule}: ${ex?.note}\x1b[0m`);
  }
  console.warn('');
}

if (newViolations.length === 0) {
  console.log('\x1b[32m✓\x1b[0m Architecture check passed — no new violations.\n');
  process.exit(0);
} else {
  console.error(`\x1b[31m✗\x1b[0m NEW architecture violations found: ${newViolations.length}\n`);

  const byFile = {};
  for (const v of newViolations) {
    if (!byFile[v.file]) byFile[v.file] = [];
    byFile[v.file].push(v);
  }

  for (const [file, vs] of Object.entries(byFile)) {
    console.error(`  \x1b[33m${file}\x1b[0m`);
    for (const v of vs) {
      console.error(`    \x1b[31m${v.rule}\x1b[0m  line ${v.line}: ${v.message}`);
      console.error(`         \x1b[2m${v.text}\x1b[0m`);
    }
    console.error('');
  }

  console.error('Fix all violations before merging. See docs/ARCHITECTURE.md for guidance.\n');
  process.exit(1);
}
