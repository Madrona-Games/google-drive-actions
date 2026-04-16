import { downloadImpl } from './download/download-impl';
import { uploadImpl } from './upload/upload-impl';
import { findImpl } from './find/find-impl';
import { deleteImpl } from './delete/delete-impl';
import { createFolderImpl } from './create-folder/create-folder-impl';
import { saveRun, saveOnlyRun } from './cache/save-impl';
import { restoreRun, restoreOnlyRun } from './cache/restore-impl';
import { clean } from './cache/clean-impl';

const actions: Record<string, () => void> = {
  download: () => downloadImpl(),
  upload: () => uploadImpl(),
  find: () => findImpl(),
  delete: () => deleteImpl(),
  'create-folder': () => createFolderImpl(),
  'cache-save': () => saveRun(true),
  'cache-restore': () => restoreRun(true),
  'cache-save-only': () => saveOnlyRun(true),
  'cache-restore-only': () => restoreOnlyRun(true),
  'cache-clean': () => clean(),
};

const actionName = process.env['GOOGLE_DRIVE_ACTION'];
if (!actionName || !actions[actionName]) {
  const available = Object.keys(actions).join(', ');
  throw new Error(`Unknown or missing action "${actionName}". Set GOOGLE_DRIVE_ACTION to one of: ${available}`);
}

actions[actionName]();
