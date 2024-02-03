import { GoogleDriveService } from '../core/google-drive-service';
import { findFileID } from '../find/find-impl';
import { Inputs, Outputs } from './constants';

import * as utils from '../core/action-utils';
import * as core from '@actions/core';

export async function uploadImpl(): Promise<void> {
  const googleDriveService = new GoogleDriveService();
  await googleDriveService.authenticate(
    utils.getInputAsString(Inputs.GoogleServiceAccountCredentialsJson, {
      required: true,
    }),
  );

  const inputDestinationFolderID = utils.getInputAsString(Inputs.DestinationFolderID);
  const inputDestinationFolderPath = utils.getInputAsString(Inputs.DestinationFolderPath);
  const inputFilePath = utils.getInputAsString(Inputs.FilePath, {
    required: true,
  });
  const inputGoogleDriveRootFolderId = utils.getInputAsString(Inputs.GoogleDriveRootFolderId);

  if (!inputDestinationFolderID && (!inputDestinationFolderPath || !inputGoogleDriveRootFolderId)) {
    throw new Error('file ID or drive path and root folder id is required');
  }

  let folderID = inputDestinationFolderID;
  if (!folderID) {
    folderID = await findFileID(inputDestinationFolderPath, inputGoogleDriveRootFolderId, googleDriveService);
  }

  const id = await googleDriveService.uploadFile(folderID, inputFilePath);
  core.setOutput(Outputs.FileID, id);
}
