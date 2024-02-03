"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleDriveService = void 0;
// eslint-disable-next-line camelcase
const googleapis_1 = require("googleapis");
const node_fs_1 = require("node:fs");
const core = __importStar(require("@actions/core"));
const node_path_1 = __importDefault(require("node:path"));
class GoogleDriveService {
    // eslint-disable-next-line camelcase
    drive;
    async authenticate(credentialJson) {
        const key = JSON.parse(credentialJson);
        const serviceAuth = new googleapis_1.google.auth.GoogleAuth({
            credentials: key,
            scopes: ['https://www.googleapis.com/auth/drive'],
        });
        this.drive = googleapis_1.google.drive({ version: 'v3', auth: serviceAuth });
    }
    async uploadFile(folderId, filePath) {
        if (!this.drive) {
            core.debug('Drive is not initialized');
            return undefined;
        }
        core.debug(`Uploading ${filePath}`);
        const safeFilePath = filePath.replaceAll(new RegExp(`\\${node_path_1.default.sep}`, 'g'), '/');
        const response = await this.drive.files.create({
            requestBody: {
                parents: [folderId],
                name: safeFilePath.slice(safeFilePath.lastIndexOf('/') + 1),
            },
            media: {
                body: (0, node_fs_1.createReadStream)(filePath),
            },
            supportsAllDrives: true,
        });
        return response.data.id ?? undefined;
    }
    async downloadFile(fileId, filePath) {
        if (!this.drive) {
            core.debug('Drive is not initialized');
            return;
        }
        const destination = (0, node_fs_1.createWriteStream)(filePath);
        core.debug(`Downloading cache to ${filePath}`);
        return new Promise((resolve, reject) => {
            this.drive.files.get({ fileId, alt: 'media', supportsAllDrives: true }, { responseType: 'stream' }, function (error, response) {
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
            });
        });
    }
    async findFileIDByName(folderId, name) {
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
    async getNameFromID(fileId) {
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
    async deleteFile(fileId) {
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
    async updateDescription(fileId, description) {
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
    async createFolder(name, parent) {
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
exports.GoogleDriveService = GoogleDriveService;
//# sourceMappingURL=google-drive-service.js.map