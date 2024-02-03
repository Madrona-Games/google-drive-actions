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
exports.createFolderImpl = void 0;
const google_drive_service_1 = require("../core/google-drive-service");
const find_impl_1 = require("../find/find-impl");
const constants_1 = require("./constants");
const exceptions_1 = require("../core/exceptions");
const utils = __importStar(require("../core/action-utils"));
const core = __importStar(require("@actions/core"));
const node_path_1 = __importDefault(require("node:path"));
async function createFolderImpl() {
    const googleDriveService = new google_drive_service_1.GoogleDriveService();
    await googleDriveService.authenticate(utils.getInputAsString(constants_1.Inputs.GoogleServiceAccountCredentialsJson, {
        required: true,
    }));
    const inputFolderPath = utils.getInputAsString(constants_1.Inputs.FolderPath, {
        required: true,
    });
    const inputGoogleDriveRootFolderId = utils.getInputAsString(constants_1.Inputs.GoogleDriveRootFolderId, { required: true });
    const pathFragments = inputFolderPath
        .replaceAll(new RegExp(`\\${node_path_1.default.sep}`, 'g'), '/')
        .split('/')
        .filter((x) => x !== '');
    let folderID = inputGoogleDriveRootFolderId;
    for (const pathFragment of pathFragments) {
        try {
            // Check if the folder already exists
            folderID = await (0, find_impl_1.findFileID)(pathFragment, folderID, googleDriveService);
        }
        catch (error) {
            if (!(error instanceof exceptions_1.FileNotFoundException)) {
                throw error;
            }
            // Folder didn't already exist so we create it
            folderID = await googleDriveService.createFolder(pathFragment, folderID);
        }
    }
    core.setOutput(constants_1.Outputs.folderID, folderID);
}
exports.createFolderImpl = createFolderImpl;
//# sourceMappingURL=create-folder-impl.js.map