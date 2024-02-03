import { GoogleDriveService } from '../core/google-drive-service';
import { Inputs, Outputs } from './constants';
import { FileNotFoundException } from '../core/exceptions';
import * as utils from '../core/action-utils';
import * as core from '@actions/core';
import path from 'node:path';

export async function findImpl(): Promise<void> {
  const googleDriveService = new GoogleDriveService();
  await googleDriveService.authenticate(
    utils.getInputAsString(Inputs.GoogleServiceAccountCredentialsJson, {
      required: true,
    }),
  );

  const drivePath = utils.getInputAsString(Inputs.DrivePath, {
    required: true,
  });

  const rootFolderID = utils.getInputAsString(Inputs.GoogleDriveRootFolderId, {
    required: true,
  });

  const fileID = await findFileID(drivePath, rootFolderID, googleDriveService);
  core.setOutput(Outputs.FileID, fileID);
}

export async function findFileID(
  drivePath: string,
  parentFolderID: string,
  driveService: GoogleDriveService,
): Promise<string> {
  const pathFragments = drivePath
    .replaceAll(new RegExp(`\\${path.sep}`, 'g'), '/')
    .split('/')
    .filter((x) => x !== '');

  for (const pathFragment of pathFragments) {
    const fileID = await driveService.findFileIDByName(parentFolderID, pathFragment);
    if (!fileID) {
      throw new FileNotFoundException(`File not found: ${drivePath}`);
    }
    parentFolderID = fileID;
  }

  return parentFolderID;
}
