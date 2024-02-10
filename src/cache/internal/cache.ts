import * as core from '@actions/core';
import * as path from 'node:path';
import * as utils from './cache-utils';
import { createTar, extractTar, listTar } from './tar';
import { GoogleDriveService } from '../../core/google-drive-service';
import { Inputs } from '../constants';
import { getInputAsString } from '../../core/action-utils';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class ReserveCacheError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReserveCacheError';
    Object.setPrototypeOf(this, ReserveCacheError.prototype);
  }
}

function checkPaths(paths: string[]): void {
  if (!paths || paths.length === 0) {
    throw new ValidationError(`Path Validation Error: At least one directory or file path is required`);
  }
}

function checkKey(key: string): void {
  if (key.length > 512) {
    throw new ValidationError(`Key Validation Error: ${key} cannot be larger than 512 characters.`);
  }
  const regex = /^[^,]*$/;
  if (!regex.test(key)) {
    throw new ValidationError(`Key Validation Error: ${key} cannot contain commas.`);
  }
}

/**
 * Restores cache from keys
 *
 * @param googleDriveFolderId ID of the root folder to save the cache
 * @param primaryKey an explicit key for restoring the cache
 * @param lookupOnly skip downloading cache archive and only performs cache key lookup
 * @param restoreKeys an optional ordered list of keys to use for restoring the cache if no cache hit occurred for key
 * @returns string returns the key for the cache hit, otherwise returns undefined
 */
export async function restoreCache(
  googleDriveFolderId: string,
  primaryKey: string,
  lookupOnly: boolean,
  restoreKeys?: string[],
): Promise<string | undefined> {
  restoreKeys = restoreKeys ?? [];
  const keys = [primaryKey, ...restoreKeys];

  core.debug('Resolved Keys:');
  core.debug(JSON.stringify(keys));

  if (keys.length > 10) {
    throw new ValidationError(`Key Validation Error: Keys are limited to a maximum of 10.`);
  }
  for (const key of keys) {
    checkKey(key);
  }

  const compressionMethod = await utils.getCompressionMethod();
  core.debug(compressionMethod);

  let archivePath = '';
  try {
    const googleDriveService = new GoogleDriveService();
    await googleDriveService.authenticate(
      getInputAsString(Inputs.GoogleServiceAccountCredentialsJson, {
        required: true,
      }),
    );

    const files = await googleDriveService.getFilesInFolder(googleDriveFolderId);

    core.debug(`Searching for cache with keys: ${keys.join(', ')}`);

    let cacheEntry = undefined;
    let cacheKey = undefined;
    for (const key of keys) {
      const file = files.find((fileInstance) => fileInstance.name.startsWith(key));

      if (file?.id && file?.name) {
        cacheEntry = file;
        cacheKey = key;
      }
    }

    if (!cacheEntry) {
      core.debug('Cache not found');

      return undefined;
    }

    if (lookupOnly) {
      core.info('Lookup only - skipping download');

      return cacheKey;
    }

    archivePath = path.join(await utils.createTemporaryDirectory(), cacheEntry.name);

    core.debug(`Archive Path: ${archivePath}`);

    // Download the cache from the cache
    await googleDriveService.downloadFile(cacheEntry.id, archivePath);

    const key = cacheEntry.name.slice(0, cacheEntry.name.lastIndexOf('.'));

    core.debug(`Cache Restore Full Key: ${key}`);

    if (core.isDebug()) {
      await listTar(archivePath, compressionMethod, key);
    }

    const archiveFileSize = utils.getArchiveFileSizeInBytes(archivePath);
    core.info(`Cache Size: ~${Math.round(archiveFileSize / (1024 * 1024))} MB (${archiveFileSize} B)`);

    await extractTar(archivePath, compressionMethod, key);
    core.info('Cache restored successfully');

    await googleDriveService.updateDescription(cacheEntry.id, `last restored: ${new Date().toISOString()}`);

    return cacheKey;
  } catch (error) {
    const typedError = error as Error;
    if (typedError.name === ValidationError.name) {
      throw error;
    } else {
      // Supress all non-validation cache related errors because caching should be optional
      core.warning(`Failed to restore: ${(error as Error).message}`);
    }
  } finally {
    // Try to delete the archive to save space
    try {
      await utils.unlinkFile(archivePath);
    } catch (error) {
      core.debug(`Failed to delete archive: ${error}`);
    }
  }

  return undefined;
}

/**
 * Saves a list of files with the specified key
 *
 * @param googleDriveFolderId ID of the root folder to save the cache
 * @param paths a list of file paths to be cached
 * @param key an explicit key for restoring the cache
 * @returns number returns cacheId if the cache was saved successfully and throws an error if save fails
 */
export async function saveCache(googleDriveFolderId: string, paths: string[], key: string): Promise<number> {
  checkPaths(paths);
  checkKey(key);

  const compressionMethod = await utils.getCompressionMethod();
  const cacheId = -1;

  const cachePaths = await utils.resolvePaths(paths);
  core.debug('Cache Paths:');
  core.debug(`${JSON.stringify(cachePaths)}`);

  if (cachePaths.length === 0) {
    throw new Error(
      `Path Validation Error: Path(s) specified in the action for caching do(es) not exist, hence no cache is being saved.`,
    );
  }

  const archiveFolder = await utils.createTemporaryDirectory();
  const archivePath = path.join(archiveFolder, utils.getCacheFileName(key, compressionMethod));

  core.debug(`Archive Path: ${archivePath}`);

  try {
    const googleDriveService = new GoogleDriveService();
    await googleDriveService.authenticate(
      getInputAsString(Inputs.GoogleServiceAccountCredentialsJson, {
        required: true,
      }),
    );

    await createTar(archiveFolder, cachePaths, compressionMethod, key);
    core.debug('Created Tar archive');

    if (core.isDebug()) {
      core.debug('Tar archive contents:');
      await listTar(archivePath, compressionMethod, key);
    }

    const archiveFileSize = utils.getArchiveFileSizeInBytes(archivePath);
    core.debug(`File Size: ${archiveFileSize}`);

    core.debug(`Saving Cache (ID: ${cacheId})`);
    await googleDriveService.uploadFile(googleDriveFolderId, archivePath);
  } catch (error) {
    const typedError = error as Error;
    if (typedError.name === ValidationError.name) {
      throw error;
    } else if (typedError.name === ReserveCacheError.name) {
      core.info(`Failed to save: ${typedError.message}`);
    } else {
      core.warning(`Failed to save: ${typedError.message}`);
    }
  } finally {
    // Try to delete the archive to save space
    try {
      await utils.unlinkFile(archivePath);
    } catch (error) {
      core.debug(`Failed to delete archive: ${error}`);
    }
  }

  return cacheId;
}
