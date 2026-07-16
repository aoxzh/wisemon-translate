#!/usr/bin/env node
/*
 * Create clean Chrome and Firefox release folders and zip files.
 */

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const archiver = require('archiver');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const releaseName = `wisemon-translate-v${pkg.version}`;
const chromeDir = path.join(DIST, `${releaseName}-chrome`);
const firefoxDir = path.join(DIST, `${releaseName}-firefox`);
const chromeZip = `${chromeDir}.zip`;
const firefoxZip = `${firefoxDir}.zip`;

const INCLUDE = [
  'background.js',
  'content_guard.js',
  'content_style.css',
  'manifest.json',
  'manifest-firefox.json',
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

function copyItem(relPath, releaseDir) {
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

function zipRelease(releaseDir, zipPath) {
  if (fs.existsSync(zipPath)) fs.rmSync(zipPath, { force: true });
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    output.on('close', resolve);
    output.on('error', reject);
    archive.on('warning', warning => warning.code === 'ENOENT' ? console.warn(warning.message) : reject(warning));
    archive.on('error', reject);
    archive.pipe(output);
    archive.directory(releaseDir, false);
    archive.finalize();
  });
}

async function main() {
  run(process.execPath, ['tools/validate.js']);
  fs.mkdirSync(DIST, { recursive: true });
  removeDir(chromeDir);
  removeDir(firefoxDir);
  fs.mkdirSync(chromeDir, { recursive: true });
  fs.mkdirSync(firefoxDir, { recursive: true });
  for (const item of INCLUDE) {
    copyItem(item, chromeDir);
    copyItem(item, firefoxDir);
  }
  fs.rmSync(path.join(chromeDir, 'manifest-firefox.json'), { force: true });
  fs.copyFileSync(path.join(firefoxDir, 'manifest-firefox.json'), path.join(firefoxDir, 'manifest.json'));
  fs.rmSync(path.join(firefoxDir, 'manifest-firefox.json'), { force: true });
  await zipRelease(chromeDir, chromeZip);
  await zipRelease(firefoxDir, firefoxZip);
  console.log(`\nPackaged ${releaseName}`);
  console.log(`Chrome:  ${chromeZip}`);
  console.log(`Firefox: ${firefoxZip}`);
}

main().catch(error => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
