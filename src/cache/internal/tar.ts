import { exec } from '@actions/exec';
import * as io from '@actions/io';
import { existsSync, writeFileSync } from 'node:fs';
import * as path from 'node:path';
import * as utils from './cache-utils';
import { ArchiveTool } from './contracts.d';
import {
  CompressionMethod,
  SystemTarPathOnWindows,
  ArchiveToolType,
  TarFilename,
  ManifestFilename,
} from '../constants';

const IS_WINDOWS = process.platform === 'win32';

// Returns tar path and type: BSD or GNU
async function getTarPath(): Promise<ArchiveTool> {
  switch (process.platform) {
    case 'win32': {
      const gnuTar = await utils.getGnuTarPathOnWindows();
      const systemTar = SystemTarPathOnWindows;
      if (gnuTar) {
        // Use GNUtar as default on windows
        return <ArchiveTool>{ path: gnuTar, type: ArchiveToolType.GNU };
      } else if (existsSync(systemTar)) {
        return <ArchiveTool>{ path: systemTar, type: ArchiveToolType.BSD };
      }
      break;
    }
    case 'darwin': {
      const gnuTar = await io.which('gtar', false);

      // fix permission denied errors when extracting BSD tar archive with GNU tar - https://github.com/actions/cache/issues/527
      return gnuTar
        ? <ArchiveTool>{ path: gnuTar, type: ArchiveToolType.GNU }
        : <ArchiveTool>{ path: await io.which('tar', true), type: ArchiveToolType.BSD };
    }
    default: {
      break;
    }
  }

  // Default assumption is GNU tar is present in path
  return <ArchiveTool>{
    path: await io.which('tar', true),
    type: ArchiveToolType.GNU,
  };
}

// Return arguments for tar as per tarPath, compressionMethod, method type and os
async function getTarArguments(
  tarPath: ArchiveTool,
  compressionMethod: CompressionMethod,
  type: string,
  key: string,
  archivePath = '',
): Promise<string[]> {
  const arguments_ = [`"${tarPath.path}"`];
  const cacheFileName = utils.getCacheFileName(key, compressionMethod);

  const tarFile = 'cache.tar';
  const workingDirectory = getWorkingDirectory();

  // Speficic args for BSD tar on windows for workaround
  const BSD_TAR_ZSTD =
    tarPath.type === ArchiveToolType.BSD && compressionMethod !== CompressionMethod.Gzip && IS_WINDOWS;

  // Method specific args
  switch (type) {
    case 'create': {
      arguments_.push(
        '--posix',
        '-cf',
        BSD_TAR_ZSTD ? tarFile : cacheFileName.replaceAll(new RegExp(`\\${path.sep}`, 'g'), '/'),
        '--exclude',
        BSD_TAR_ZSTD ? tarFile : cacheFileName.replaceAll(new RegExp(`\\${path.sep}`, 'g'), '/'),
        '-P',
        '-C',
        workingDirectory.replaceAll(new RegExp(`\\${path.sep}`, 'g'), '/'),
        '--files-from',
        ManifestFilename,
      );
      break;
    }
    case 'extract': {
      arguments_.push(
        '-xf',
        BSD_TAR_ZSTD ? tarFile : archivePath.replaceAll(new RegExp(`\\${path.sep}`, 'g'), '/'),
        '-P',
        '-C',
        workingDirectory.replaceAll(new RegExp(`\\${path.sep}`, 'g'), '/'),
      );
      break;
    }
    case 'list': {
      arguments_.push(
        '-tf',
        BSD_TAR_ZSTD ? tarFile : archivePath.replaceAll(new RegExp(`\\${path.sep}`, 'g'), '/'),
        '-P',
      );
      break;
    }
  }

  // Platform specific args
  if (tarPath.type === ArchiveToolType.GNU) {
    switch (process.platform) {
      case 'win32': {
        arguments_.push('--force-local');
        break;
      }
      case 'darwin': {
        arguments_.push('--delay-directory-restore');
        break;
      }
    }
  }

  return arguments_;
}

// Returns commands to run tar and compression program
async function getCommands(
  compressionMethod: CompressionMethod,
  type: string,
  key: string,
  archivePath = '',
): Promise<string[]> {
  const tarPath = await getTarPath();
  const tarArguments = await getTarArguments(tarPath, compressionMethod, type, key, archivePath);
  const compressionArguments =
    type === 'create'
      ? await getCompressionProgram(tarPath, compressionMethod, key)
      : await getDecompressionProgram(tarPath, compressionMethod, archivePath);
  const BSD_TAR_ZSTD =
    tarPath.type === ArchiveToolType.BSD && compressionMethod !== CompressionMethod.Gzip && IS_WINDOWS;

  const arguments_ =
    BSD_TAR_ZSTD && type !== 'create'
      ? [[...compressionArguments].join(' '), [...tarArguments].join(' ')]
      : [[...tarArguments].join(' '), [...compressionArguments].join(' ')];

  if (BSD_TAR_ZSTD) {
    return arguments_;
  }

  return [arguments_.join(' ')];
}

function getWorkingDirectory(): string {
  return process.env['GITHUB_WORKSPACE'] ?? process.cwd();
}

// Common function for extractTar and listTar to get the compression method
async function getDecompressionProgram(
  tarPath: ArchiveTool,
  compressionMethod: CompressionMethod,
  archivePath: string,
): Promise<string[]> {
  // -d: Decompress.
  // unzstd is equivalent to 'zstd -d'
  // --long=#: Enables long distance matching with # bits. Maximum is 30 (1GB) on 32-bit OS and 31 (2GB) on 64-bit.
  const BSD_TAR_ZSTD =
    tarPath.type === ArchiveToolType.BSD && compressionMethod !== CompressionMethod.Gzip && IS_WINDOWS;
  switch (compressionMethod) {
    case CompressionMethod.Zstd: {
      return BSD_TAR_ZSTD
        ? ['zstd -d --long=31 --force -o', TarFilename, archivePath.replaceAll(new RegExp(`\\${path.sep}`, 'g'), '/')]
        : ['--use-compress-program', IS_WINDOWS ? '"zstd -d --long=31"' : 'unzstd --long=31'];
    }
    case CompressionMethod.ZstdWithoutLong: {
      return BSD_TAR_ZSTD
        ? ['zstd -d --force -o', TarFilename, archivePath.replaceAll(new RegExp(`\\${path.sep}`, 'g'), '/')]
        : ['--use-compress-program', IS_WINDOWS ? '"zstd -d"' : 'unzstd'];
    }
    default: {
      return ['-z'];
    }
  }
}

// Used for creating the archive
// -T#: Compress using # working thread. If # is 0, attempt to detect and use the number of physical CPU cores.
// zstdmt is equivalent to 'zstd -T0'
// --long=#: Enables long distance matching with # bits. Maximum is 30 (1GB) on 32-bit OS and 31 (2GB) on 64-bit.
// Using 30 here because we also support 32-bit self-hosted runners.
// Long range mode is added to zstd in v1.3.2 release, so we will not use --long in older version of zstd.
async function getCompressionProgram(
  tarPath: ArchiveTool,
  compressionMethod: CompressionMethod,
  key: string,
): Promise<string[]> {
  const cacheFileName = utils.getCacheFileName(key, compressionMethod);
  const BSD_TAR_ZSTD =
    tarPath.type === ArchiveToolType.BSD && compressionMethod !== CompressionMethod.Gzip && IS_WINDOWS;
  switch (compressionMethod) {
    case CompressionMethod.Zstd: {
      return BSD_TAR_ZSTD
        ? [
            'zstd -T0 --long=30 --force -o',
            cacheFileName.replaceAll(new RegExp(`\\${path.sep}`, 'g'), '/'),
            TarFilename,
          ]
        : ['--use-compress-program', IS_WINDOWS ? '"zstd -T0 --long=30"' : 'zstdmt --long=30'];
    }
    case CompressionMethod.ZstdWithoutLong: {
      return BSD_TAR_ZSTD
        ? ['zstd -T0 --force -o', cacheFileName.replaceAll(new RegExp(`\\${path.sep}`, 'g'), '/'), TarFilename]
        : ['--use-compress-program', IS_WINDOWS ? '"zstd -T0"' : 'zstdmt'];
    }
    default: {
      return ['-z'];
    }
  }
}

// Executes all commands as separate processes
async function execCommands(commands: string[], cwd?: string): Promise<void> {
  for (const command of commands) {
    try {
      await exec(command, undefined, {
        cwd,
        env: { ...(process.env as object), MSYS: 'winsymlinks:nativestrict' },
      });
    } catch (error) {
      throw new Error(`${command.split(' ')[0]} failed with error: ${(error as Error)?.message}`);
    }
  }
}

// List the contents of a tar
export async function listTar(archivePath: string, compressionMethod: CompressionMethod, key: string): Promise<void> {
  const commands = await getCommands(compressionMethod, 'list', key, archivePath);
  await execCommands(commands);
}

// Extract a tar
export async function extractTar(
  archivePath: string,
  compressionMethod: CompressionMethod,
  key: string,
): Promise<void> {
  // Create directory to extract tar into
  const workingDirectory = getWorkingDirectory();
  await io.mkdirP(workingDirectory);
  const commands = await getCommands(compressionMethod, 'extract', key, archivePath);
  await execCommands(commands);
}

// Create a tar
export async function createTar(
  archiveFolder: string,
  sourceDirectories: string[],
  compressionMethod: CompressionMethod,
  key: string,
): Promise<void> {
  // Write source directories to manifest.txt to avoid command length limits
  writeFileSync(path.join(archiveFolder, ManifestFilename), sourceDirectories.join('\n'));
  const commands = await getCommands(compressionMethod, 'create', key);
  await execCommands(commands, archiveFolder);
}
