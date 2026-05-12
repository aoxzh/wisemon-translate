#!/usr/bin/env node
/*
 * Create a clean Chrome extension release folder and zip.
 */

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const releaseName = `wisemon-translate-v${pkg.version}`;
const releaseDir = path.join(DIST, releaseName);
const zipPath = path.join(DIST, `${releaseName}.zip`);

const INCLUDE = [
  'background.js',
  'content_guard.js',
  'content_style.css',
  'manifest.json',
  'options.css',
  'options.html',
  'options.js',
  'popup.css',
  'popup.html',
  'popup.js',
  'privacy.html',
  'sidepanel.css',
  'sidepanel.html',
  'sidepanel.js',
  'README.md',
  'icons',
  'vendor',
  'src/content',
  'src/injectors',
  'src/lib'
];

function removeDir(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

function copyItem(relPath) {
  const source = path.join(ROOT, relPath);
  const target = path.join(releaseDir, relPath);
  if (!fs.existsSync(source)) throw new Error(`Missing release source: ${relPath}`);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.cpSync(source, target, { recursive: true });
}

function run(command, args) {
  const result = childProcess.spawnSync(command, args, {
    cwd: ROOT,
    stdio: 'inherit',
    shell: false
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed`);
  }
}

function zipRelease() {
  if (fs.existsSync(zipPath)) fs.rmSync(zipPath, { force: true });
  const zipLiteral = zipPath.replace(/'/g, "''");
  const sourceLiteral = path.join(releaseDir, '*').replace(/'/g, "''");
  const ps = [
    '$ErrorActionPreference = "Stop"',
    `Compress-Archive -Path '${sourceLiteral}' -DestinationPath '${zipLiteral}' -Force`
  ].join('; ');
  run('powershell', ['-NoProfile', '-Command', ps]);
}

function main() {
  run(process.execPath, ['tools/validate.js']);
  fs.mkdirSync(DIST, { recursive: true });
  removeDir(releaseDir);
  fs.mkdirSync(releaseDir, { recursive: true });
  for (const item of INCLUDE) copyItem(item);
  zipRelease();
  console.log(`\nPackaged ${releaseName}`);
  console.log(`Folder: ${releaseDir}`);
  console.log(`Zip:    ${zipPath}`);
}

main();
