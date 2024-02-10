/* eslint no-shadow: 0 */
/* eslint no-unused-vars: 0 */

export enum Inputs {
  Key = 'key', // Input for cache, restore, save action
  Path = 'path', // Input for cache, restore, save action
  RestoreKeys = 'restore-keys', // Input for cache, restore action
  EnableCrossOsArchive = 'enableCrossOsArchive', // Input for cache, restore, save action
  FailOnCacheMiss = 'fail-on-cache-miss', // Input for cache, restore action
  LookupOnly = 'lookup-only', // Input for cache, restore action
  GoogleServiceAccountCredentialsJson = 'google-service-account-credentials-json', // Input for cache, restore, save action
  GoogleDriveFolderId = 'google-drive-folder-id', // Input for cache, restore, save action
  MaxCacheAge = 'max-cache-age', // Input for clean action
}

export enum Outputs {
  CacheHit = 'cache-hit', // Output from cache, restore action
  CachePrimaryKey = 'cache-primary-key', // Output from restore action
  CacheMatchedKey = 'cache-matched-key', // Output from restore action
}

export enum State {
  CachePrimaryKey = 'CACHE_KEY',
  CacheMatchedKey = 'CACHE_RESULT',
}

// eslint-disable-next-line unicorn/prevent-abbreviations
export const RefKey = 'GITHUB_REF';

export enum CacheFileExtension {
  Gzip = '.tgz',
  Zstd = '.tzst',
}

export enum CompressionMethod {
  Gzip = 'gzip',

  // Long range mode was added to zstd in v1.3.2.
  // This enum is for earlier version of zstd that does not have --long support
  ZstdWithoutLong = 'zstd-without-long',
  Zstd = 'zstd',
}

export enum ArchiveToolType {
  GNU = 'gnu',
  BSD = 'bsd',
}

// The default number of retry attempts.
export const DefaultRetryAttempts = 2;

// The default delay in milliseconds between retry attempts.
export const DefaultRetryDelay = 5000;

// Socket timeout in milliseconds during download.  If no traffic is received
// over the socket during this period, the socket is destroyed and the download
// is aborted.
export const SocketTimeout = 5000;

// The default path of GNUtar on hosted Windows runners
export const GnuTarPathOnWindows = `${process.env['PROGRAMFILES']}\\Git\\usr\\bin\\tar.exe`;

// The default path of BSDtar on hosted Windows runners
export const SystemTarPathOnWindows = `${process.env['SYSTEMDRIVE']}\\Windows\\System32\\tar.exe`;

export const TarFilename = 'cache.tar';

export const ManifestFilename = 'manifest.txt';
