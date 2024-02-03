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
exports.downloadImpl = void 0;
const google_drive_service_1 = require("../core/google-drive-service");
const find_impl_1 = require("../find/find-impl");
const constants_1 = require("./constants");
const utils = __importStar(require("../core/action-utils"));
const node_path_1 = __importDefault(require("node:path"));
async function downloadImpl() {
    const googleDriveService = new google_drive_service_1.GoogleDriveService();
    await googleDriveService.authenticate(utils.getInputAsString(constants_1.Inputs.GoogleServiceAccountCredentialsJson, {
        required: true,
    }));
    const inputDrivePath = utils.getInputAsString(constants_1.Inputs.DrivePath);
    const inputDestinationPath = utils.getInputAsString(constants_1.Inputs.DestinationPath, {
        required: true,
    });
    const inputDownloadName = utils.getInputAsString(constants_1.Inputs.DownloadName);
    const inputFileID = utils.getInputAsString(constants_1.Inputs.FileID);
    const inputGoogleDriveRootFolderId = utils.getInputAsString(constants_1.Inputs.GoogleDriveRootFolderId);
    if (!inputFileID && (!inputDrivePath || !inputGoogleDriveRootFolderId)) {
        throw new Error('file ID or drive path and root folder id is required');
    }
    let fileID = inputFileID;
    // File ID found from google drive path
    if (!fileID) {
        fileID = await (0, find_impl_1.findFileID)(inputDrivePath, inputGoogleDriveRootFolderId, googleDriveService);
    }
    let fileName = inputDownloadName;
    // Use google drive file name if download name is not provided
    if (!fileName) {
        fileName = inputDrivePath ? inputDrivePath.split('/')[-1] : await googleDriveService.getNameFromID(fileID);
    }
    const fullPath = node_path_1.default.join(inputDestinationPath, fileName);
    await googleDriveService.downloadFile(fileID, fullPath);
}
exports.downloadImpl = downloadImpl;
//# sourceMappingURL=download-impl.js.map