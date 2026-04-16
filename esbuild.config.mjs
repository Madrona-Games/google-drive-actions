import * as esbuild from 'esbuild';
import * as fs from 'node:fs';
import * as path from 'node:path';

// Stubs: each maps a dist output path to the action name used by src/main.ts
const stubs = [
  { outfile: 'dist/download/index.js', action: 'download', sharedPath: '../shared/index.js' },
  {
    outfile: 'dist/create-folder/index.js',
    action: 'create-folder',
    sharedPath: '../shared/index.js',
  },
  { outfile: 'dist/delete/index.js', action: 'delete', sharedPath: '../shared/index.js' },
  { outfile: 'dist/find/index.js', action: 'find', sharedPath: '../shared/index.js' },
  { outfile: 'dist/upload/index.js', action: 'upload', sharedPath: '../shared/index.js' },
  {
    outfile: 'dist/cache/save/index.js',
    action: 'cache-save',
    sharedPath: '../../shared/index.js',
  },
  {
    outfile: 'dist/cache/restore/index.js',
    action: 'cache-restore',
    sharedPath: '../../shared/index.js',
  },
  {
    outfile: 'dist/cache/save-only/index.js',
    action: 'cache-save-only',
    sharedPath: '../../shared/index.js',
  },
  {
    outfile: 'dist/cache/restore-only/index.js',
    action: 'cache-restore-only',
    sharedPath: '../../shared/index.js',
  },
  {
    outfile: 'dist/cache/clean/index.js',
    action: 'cache-clean',
    sharedPath: '../../shared/index.js',
  },
];

/**
 * Extracts license information from bundled packages using esbuild's metafile
 * and writes a licenses.txt file to the output directory.
 */
function extractLicenses(metafile, outdir) {
  const packages = new Map();

  for (const inputPath of Object.keys(metafile.inputs)) {
    const match = new RegExp(/^node_modules\/(@[^/]+\/[^/]+|[^/]+)/).exec(inputPath);
    if (match) {
      packages.set(match[1], true);
    }
  }

  const licenseEntries = [];

  for (const packageName of [...packages.keys()].sort()) {
    const packageDir = path.join('node_modules', packageName);
    let licenseType = 'Unknown';
    let licenseText = '';

    // Read package.json for license field
    try {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(packageDir, 'package.json'), 'utf-8'),
      );
      licenseType = packageJson.license || 'Unknown';
    } catch {
      // package.json not found or unreadable
    }

    // Try to find a LICENSE file
    const licenseFileNames = [
      'LICENSE',
      'LICENSE.md',
      'LICENSE.txt',
      'LICENCE',
      'LICENCE.md',
      'LICENCE.txt',
      'license',
      'license.md',
      'license.txt',
    ];

    for (const fileName of licenseFileNames) {
      try {
        licenseText = fs.readFileSync(path.join(packageDir, fileName), 'utf-8').trim();
        break;
      } catch {
        // Try next filename
      }
    }

    licenseEntries.push(`${packageName}\n${licenseType}\n${licenseText ? `\n${licenseText}` : ''}`);
  }

  if (licenseEntries.length > 0) {
    fs.mkdirSync(outdir, { recursive: true });
    fs.writeFileSync(path.join(outdir, 'licenses.txt'), licenseEntries.join('\n\n---\n\n') + '\n');
  }
}

// 1. Clean dist directory
fs.rmSync('dist', { recursive: true, force: true });

// 2. Build the single shared bundle
const sharedOutdir = 'dist/shared';

const result = await esbuild.build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  platform: 'node',
  target: 'node24',
  format: 'cjs',
  minify: true,
  sourcemap: true,
  outdir: sharedOutdir,
  outbase: '.',
  metafile: true,
  entryNames: 'index',
});

extractLicenses(result.metafile, sharedOutdir);

// 3. Generate tiny stub files for each action
for (const { outfile, action, sharedPath } of stubs) {
  const dir = path.dirname(outfile);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    outfile,
    `process.env["GOOGLE_DRIVE_ACTION"] = "${action}";\nrequire("${sharedPath}");\n`,
  );
}
