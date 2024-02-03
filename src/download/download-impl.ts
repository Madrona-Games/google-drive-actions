import { GoogleDriveService } from '../core/google-drive-service';
import { findFileID } from '../find/find-impl';
import { Inputs } from './constants';

import * as utils from '../core/action-utils';
import path from 'node:path';

export async function downloadImpl(): Promise<number | void> {
  const googleDriveService = new GoogleDriveService();
  await googleDriveService.authenticate(
    utils.getInputAsString(Inputs.GoogleServiceAccountCredentialsJson, {
      required: true,
    }),
  );

  const inputDrivePath = utils.getInputAsString(Inputs.DrivePath);
  const inputDestinationPath = utils.getInputAsString(Inputs.DestinationPath, {
    required: true,
  });
  const inputDownloadName = utils.getInputAsString(Inputs.DownloadName);
  const inputFileID = utils.getInputAsString(Inputs.FileID);
  const inputGoogleDriveRootFolderId = utils.getInputAsString(Inputs.GoogleDriveRootFolderId);

  if (!inputFileID && (!inputDrivePath || !inputGoogleDriveRootFolderId)) {
    throw new Error('file ID or drive path and root folder id is required');
  }

  let fileID = inputFileID;

  // File ID found from google drive path
  if (!fileID) {
    fileID = await findFileID(inputDrivePath, inputGoogleDriveRootFolderId, googleDriveService);
  }

  let fileName = inputDownloadName;

  // Use google drive file name if download name is not provided
  if (!fileName) {
    fileName = inputDrivePath ? inputDrivePath.split('/')[-1] : await googleDriveService.getNameFromID(fileID);
  }

  const fullPath = path.join(inputDestinationPath, fileName);

  await googleDriveService.downloadFile(fileID, fullPath);
}
