import * as core from '@actions/core';
import * as cache from './internal/cache';

import { Inputs, Outputs, State } from './constants';
import { IStateProvider, NullStateProvider, StateProvider } from './state-provider';
import * as utils from '../core/action-utils';
import * as cacheUtils from './internal/cache-utils';

export async function restoreImpl(stateProvider: IStateProvider): Promise<string | undefined> {
  try {
    const primaryKey = core.getInput(Inputs.Key, { required: true });
    stateProvider.setState(State.CachePrimaryKey, primaryKey);

    const restoreKeys = utils.getInputAsArray(Inputs.RestoreKeys);
    const failOnCacheMiss = utils.getInputAsBool(Inputs.FailOnCacheMiss);
    const lookupOnly = utils.getInputAsBool(Inputs.LookupOnly);

    const cacheKey = await cache.restoreCache(
      utils.getInputAsString(Inputs.GoogleDriveFolderId, { required: true }),
      primaryKey,
      lookupOnly,
      restoreKeys,
    );

    if (!cacheKey) {
      if (failOnCacheMiss) {
        throw new Error(
          `Failed to restore cache entry. Exiting as fail-on-cache-miss is set. Input key: ${primaryKey}`,
        );
      }
      core.info(`Cache not found for input keys: ${[primaryKey, ...restoreKeys].join(', ')}`);

      return;
    }

    // Store the matched cache key in states
    stateProvider.setState(State.CacheMatchedKey, cacheKey);

    const isExactKeyMatch = cacheUtils.isExactKeyMatch(core.getInput(Inputs.Key, { required: true }), cacheKey);

    core.setOutput(Outputs.CacheHit, isExactKeyMatch.toString());
    if (lookupOnly) {
      core.info(`Cache found and can be restored from key: ${cacheKey}`);
    } else {
      core.info(`Cache restored from key: ${cacheKey}`);
    }

    return cacheKey;
  } catch (error: unknown) {
    core.setFailed((error as Error).message);
  }
}

async function run(stateProvider: IStateProvider, earlyExit: boolean | undefined): Promise<void> {
  try {
    await restoreImpl(stateProvider);
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

export async function restoreOnlyRun(earlyExit?: boolean | undefined): Promise<void> {
  await run(new NullStateProvider(), earlyExit);
}

export async function restoreRun(earlyExit?: boolean | undefined): Promise<void> {
  await run(new StateProvider(), earlyExit);
}
