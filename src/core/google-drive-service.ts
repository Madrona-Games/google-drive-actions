// eslint-disable-next-line camelcase
import { google, drive_v3 } from 'googleapis';
import { createReadStream, createWriteStream } from 'node:fs';
import * as core from '@actions/core';
import path from 'node:path';

export class GoogleDriveService {
  // eslint-disable-next-line camelcase
  private drive?: drive_v3.Drive;

  async authenticate(credentialJson: string): Promise<void> {
    const key = JSON.parse(credentialJson);

    const serviceAuth = new google.auth.GoogleAuth({
      credentials: key,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });

    this.drive = google.drive({ version: 'v3', auth: serviceAuth });
  }

  async uploadFile(folderId: string, filePath: string): Promise<string | undefined> {
    if (!this.drive) {
      core.debug('Drive is not initialized');

      return undefined;
    }
    core.debug(`Uploading ${filePath}`);

    const safeFilePath = filePath.replaceAll(new RegExp(`\\${path.sep}`, 'g'), '/');
    const response = await this.drive.files.create({
      requestBody: {
        parents: [folderId],
        name: safeFilePath.slice(safeFilePath.lastIndexOf('/') + 1),
      },
      media: {
        body: createReadStream(filePath),
      },
      supportsAllDrives: true,
    });

    return response.data.id ?? undefined;
  }

  async downloadFile(fileId: string, filePath: string): Promise<void> {
    if (!this.drive) {
      core.debug('Drive is not initialized');

      return;
    }

    const destination = createWriteStream(filePath);
    core.debug(`Downloading cache to ${filePath}`);

    return new Promise((resolve, reject) => {
      this.drive!.files.get(
        { fileId, alt: 'media', supportsAllDrives: true },
        { responseType: 'stream' },
        function (error, response) {
          response?.data
            .on('end', () => {
              core.debug('Done downloading cache.');
              resolve();
            })
            .on('error', (innerError) => {
              core.warning(`Error downloading cache: ${innerError}`);
              reject(innerError);
            })
            .pipe(destination);
        },
      );
    });
  }

  async findFileIDByName(folderId: string, name: string): Promise<string | null | undefined> {
    if (!this.drive) {
      core.debug('Drive is not initialized');

      return;
    }
    core.debug(`Searching for ${name}`);

    const response = await this.drive.files.list({
      q: `'${folderId}' in parents and name='${name}' and trashed = false`,
      fields: 'files(id)',
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
      corpora: 'allDrives',
    });

    if (!response?.data.files) {
      core.debug('No files found');

      return undefined;
    }

    return response.data.files[0].id;
  }

  async getNameFromID(fileId: string): Promise<string> {
    if (!this.drive) {
      core.debug('Drive is not initialized');

      return '';
    }
    core.debug(`Getting name for file with id: ${fileId}`);

    const response = await this.drive.files.get({
      fileId,
      fields: 'name',
      supportsAllDrives: true,
    });

    return response.data.name ?? '';
  }

  async deleteFile(fileId: string): Promise<void> {
    if (!this.drive) {
      core.debug('Drive is not initialized');

      return;
    }
    core.debug(`Trashing file with id: ${fileId}`);

    await this.drive.files.update({
      fileId,
      requestBody: { trashed: true },
      supportsAllDrives: true,
    });
  }

  async updateDescription(fileId: string, description: string): Promise<void> {
    if (!this.drive) {
      core.debug('Drive is not initialized');

      return;
    }
    core.debug(`Updating description for file with id: ${fileId}`);

    await this.drive.files.update({
      fileId,
      requestBody: { description },
      supportsAllDrives: true,
    });
  }

  async createFolder(name: string, parent: string): Promise<string> {
    if (!this.drive) {
      core.debug('Drive is not initialized');

      return '';
    }
    core.debug(`Creating folder with name: ${name}`);

    const response = await this.drive.files.create({
      requestBody: {
        parents: [parent],
        name,
        mimeType: 'application/vnd.google-apps.folder',
      },
      supportsAllDrives: true,
    });

    return response.data.id ?? '';
  }
}
