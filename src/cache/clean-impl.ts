import { getInputAsInt, getInputAsString } from '../core/action-utils';
import { GoogleDriveService } from '../core/google-drive-service';
import { Inputs } from './constants';

export async function clean() {
  const googleDriveService = new GoogleDriveService();
  await googleDriveService.authenticate(
    getInputAsString(Inputs.GoogleServiceAccountCredentialsJson, {
      required: true,
    }),
  );

  const cacheMaxAgeMilliseconds = getInputAsInt(Inputs.MaxCacheAge, { required: true })! * 24 * 60 * 60 * 1000;

  const cleanDate = new Date(Date.now() - cacheMaxAgeMilliseconds);

  const folderId = getInputAsString(Inputs.GoogleDriveFolderId, { required: true });

  const files = await googleDriveService.getFilesInFolder(folderId, cleanDate);

  for (const file of files) {
    await googleDriveService.deleteFile(file.id);
  }
}
