import { GoogleDriveService } from '../core/google-drive-service';
import { findFileID } from '../find/find-impl';
import { Inputs } from './constants';

import * as utils from '../core/action-utils';

export async function deleteImpl(): Promise<void> {
  const googleDriveService = new GoogleDriveService();
  await googleDriveService.authenticate(
    utils.getInputAsString(Inputs.GoogleServiceAccountCredentialsJson, {
      required: true,
    }),
  );

  const inputFileID = utils.getInputAsString(Inputs.FileID);
  const inputDriveFilePath = utils.getInputAsString(Inputs.DriveFilePath);
  const inputGoogleDriveRootFolderId = utils.getInputAsString(Inputs.GoogleDriveRootFolderId);

  if (!inputFileID && (!inputDriveFilePath || !inputGoogleDriveRootFolderId)) {
    throw new Error('file ID or drive file path and root folder id is required');
  }

  let fileID = inputFileID;
  if (!fileID) {
    fileID = await findFileID(inputDriveFilePath, inputGoogleDriveRootFolderId, googleDriveService);
  }

  await googleDriveService.deleteFile(fileID);
}
