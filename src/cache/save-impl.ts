import * as core from '@actions/core';

import { Inputs, State } from './constants';
import { IStateProvider, NullStateProvider, StateProvider } from './state-provider';
import * as utils from '../core/action-utils';
import * as cache from './internal/cache';
import * as cacheUtils from './internal/cache-utils';

// Catch and log any unhandled exceptions.  These exceptions can leak out of the uploadChunk method in
// @actions/toolkit when a failed upload closes the file descriptor causing any in-process reads to
// throw an uncaught exception.  Instead of failing this action, just warn.
process.on('uncaughtException', (error) => utils.logWarning(error.message));

export async function saveImpl(stateProvider: IStateProvider): Promise<number | void> {
  let cacheId = -1;
  try {
    // If restore has stored a primary key in state, reuse that
    // Else re-evaluate from inputs
    const primaryKey = stateProvider.getState(State.CachePrimaryKey) || core.getInput(Inputs.Key);

    if (!primaryKey) {
      utils.logWarning(`Key is not specified.`);

      return;
    }

    // If matched restore key is same as primary key, then do not save cache
    // NO-OP in case of SaveOnly action
    const restoredKey = stateProvider.getCacheState();

    if (cacheUtils.isExactKeyMatch(primaryKey, restoredKey)) {
      core.info(`Cache hit occurred on the primary key ${primaryKey}, not saving cache.`);

      return;
    }

    const cachePaths = utils.getInputAsArray(Inputs.Path, {
      required: true,
    });

    cacheId = await cache.saveCache(
      utils.getInputAsString(Inputs.GoogleDriveFolderId, { required: true }),
      cachePaths,
      primaryKey,
    );

    if (cacheId !== -1) {
      core.info(`Cache saved with key: ${primaryKey}`);
    }
  } catch (error: unknown) {
    utils.logWarning((error as Error).message);
  }

  return cacheId;
}

export async function saveOnlyRun(earlyExit?: boolean | undefined): Promise<void> {
  try {
    const cacheId = await saveImpl(new NullStateProvider());
    if (cacheId === -1) {
      core.warning(`Cache save failed.`);
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    if (earlyExit) {
      // eslint-disable-next-line unicorn/no-process-exit
      process.exit(1);
    }
  }

  // node will stay alive if any promises are not resolved,
  // which is a possibility if HTTP requests are dangling
  // due to retries or timeouts. We know that if we got here
  // that all promises that we care about have successfully
  // resolved, so simply exit with success.
  if (earlyExit) {
    // eslint-disable-next-line unicorn/no-process-exit
    process.exit(0);
  }
}

export async function saveRun(earlyExit?: boolean | undefined): Promise<void> {
  try {
    await saveImpl(new StateProvider());
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    if (earlyExit) {
      // eslint-disable-next-line unicorn/no-process-exit
      process.exit(1);
    }
  }

  // node will stay alive if any promises are not resolved,
  // which is a possibility if HTTP requests are dangling
  // due to retries or timeouts. We know that if we got here
  // that all promises that we care about have successfully
  // resolved, so simply exit with success.
  if (earlyExit) {
    // eslint-disable-next-line unicorn/no-process-exit
    process.exit(0);
  }
}
