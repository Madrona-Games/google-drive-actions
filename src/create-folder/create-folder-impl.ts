import { GoogleDriveService } from '../core/google-drive-service';
import { findFileID } from '../find/find-impl';
import { Inputs, Outputs } from './constants';
import { FileNotFoundException } from '../core/exceptions';

import * as utils from '../core/action-utils';
import * as core from '@actions/core';
import path from 'node:path';

export async function createFolderImpl(): Promise<void> {
  const googleDriveService = new GoogleDriveService();
  await googleDriveService.authenticate(
    utils.getInputAsString(Inputs.GoogleServiceAccountCredentialsJson, {
      required: true,
    }),
  );

  const inputFolderPath = utils.getInputAsString(Inputs.FolderPath, {
    required: true,
  });
  const inputGoogleDriveRootFolderId = utils.getInputAsString(Inputs.GoogleDriveRootFolderId, { required: true });

  const pathFragments = inputFolderPath
    .replaceAll(new RegExp(`\\${path.sep}`, 'g'), '/')
    .split('/')
    .filter((x) => x !== '');

  let folderID = inputGoogleDriveRootFolderId;
  for (const pathFragment of pathFragments) {
    try {
      // Check if the folder already exists
      folderID = await findFileID(pathFragment, folderID, googleDriveService);
    } catch (error) {
      if (!(error instanceof FileNotFoundException)) {
        throw error;
      }

      // Folder didn't already exist so we create it
      folderID = await googleDriveService.createFolder(pathFragment, folderID);
    }
  }

  core.setOutput(Outputs.folderID, folderID);
}
