import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as glob from '@actions/glob';
import * as io from '@actions/io';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as semver from 'semver';
import * as util from 'node:util';
import { v4 as uuidV4 } from 'uuid';
import { CacheFileExtension, CompressionMethod, GnuTarPathOnWindows } from '../constants';

// From https://github.com/actions/toolkit/blob/main/packages/tool-cache/src/tool-cache.ts#L23
export async function createTemporaryDirectory(): Promise<string> {
  const IS_WINDOWS = process.platform === 'win32';

  let temporaryDirectory: string = process.env['RUNNER_TEMP'] ?? '';

  if (!temporaryDirectory) {
    let baseLocation: string;
    if (IS_WINDOWS) {
      // On Windows use the USERPROFILE env variable
      baseLocation = process.env['USERPROFILE'] ?? 'C:\\';
    } else if (process.platform === 'darwin') {
      baseLocation = '/Users';
    } else {
      baseLocation = '/home';
    }
    temporaryDirectory = path.join(baseLocation, 'actions', 'temp');
  }

  const destination = path.join(temporaryDirectory, uuidV4());
  await io.mkdirP(destination);

  return destination;
}

export function getArchiveFileSizeInBytes(filePath: string): number {
  return fs.statSync(filePath).size;
}

export async function resolvePaths(patterns: string[]): Promise<string[]> {
  const paths: string[] = [];
  const workspace = process.env['GITHUB_WORKSPACE'] ?? process.cwd();
  const globber = await glob.create(patterns.join('\n'), {
    implicitDescendants: false,
  });

  for await (const file of globber.globGenerator()) {
    const relativeFile = path.relative(workspace, file).replaceAll(new RegExp(`\\${path.sep}`, 'g'), '/');
    core.debug(`Matched: ${relativeFile}`);

    // Paths are made relative so the tar entries are all relative to the root of the workspace.
    if (relativeFile === '') {
      // path.relative returns empty string if workspace and file are equal
      paths.push('.');
    } else {
      paths.push(`${relativeFile}`);
    }
  }

  return paths;
}

export async function unlinkFile(filePath: fs.PathLike): Promise<void> {
  return util.promisify(fs.unlink)(filePath);
}

async function getVersion(app: string, additionalArguments: string[] = []): Promise<string> {
  let versionOutput = '';
  additionalArguments.push('--version');
  core.debug(`Checking ${app} ${additionalArguments.join(' ')}`);
  try {
    await exec.exec(`${app}`, additionalArguments, {
      ignoreReturnCode: true,
      silent: true,
      listeners: {
        stdout: (data: Buffer): string => (versionOutput += data.toString()),
        stderr: (data: Buffer): string => (versionOutput += data.toString()),
      },
    });
  } catch (error) {
    core.debug((error as Error).message);
  }

  versionOutput = versionOutput.trim();
  core.debug(versionOutput);

  return versionOutput;
}

// Use zstandard if possible to maximize cache performance
export async function getCompressionMethod(): Promise<CompressionMethod> {
  const versionOutput = await getVersion('zstd', ['--quiet']);
  const version = semver.clean(versionOutput);
  core.debug(`zstd version: ${version}`);

  return versionOutput === '' ? CompressionMethod.Gzip : CompressionMethod.ZstdWithoutLong;
}

export function getCacheFileName(key: string, compressionMethod: CompressionMethod): string {
  return compressionMethod === CompressionMethod.Gzip ? key + CacheFileExtension.Gzip : key + CacheFileExtension.Zstd;
}

export async function getGnuTarPathOnWindows(): Promise<string> {
  if (fs.existsSync(GnuTarPathOnWindows)) {
    return GnuTarPathOnWindows;
  }
  const versionOutput = await getVersion('tar');

  return versionOutput.toLowerCase().includes('gnu tar') ? io.which('tar') : '';
}

export function assertDefined<T>(name: string, value?: T): T {
  if (value === undefined) {
    throw new Error(`Expected ${name} but value was undefiend`);
  }

  return value;
}

export function isGhes(): boolean {
  const ghUrl = new URL(process.env['GITHUB_SERVER_URL'] ?? 'https://github.com');

  return ghUrl.hostname.toUpperCase() !== 'GITHUB.COM';
}

export function isExactKeyMatch(key: string, cacheKey?: string): boolean {
  return !!(
    cacheKey &&
    cacheKey.localeCompare(key, undefined, {
      sensitivity: 'accent',
    }) === 0
  );
}
