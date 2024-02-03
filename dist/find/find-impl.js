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
exports.findFileID = exports.findImpl = void 0;
const google_drive_service_1 = require("../core/google-drive-service");
const constants_1 = require("./constants");
const exceptions_1 = require("../core/exceptions");
const utils = __importStar(require("../core/action-utils"));
const core = __importStar(require("@actions/core"));
const node_path_1 = __importDefault(require("node:path"));
async function findImpl() {
    const googleDriveService = new google_drive_service_1.GoogleDriveService();
    await googleDriveService.authenticate(utils.getInputAsString(constants_1.Inputs.GoogleServiceAccountCredentialsJson, {
        required: true,
    }));
    const drivePath = utils.getInputAsString(constants_1.Inputs.DrivePath, {
        required: true,
    });
    const rootFolderID = utils.getInputAsString(constants_1.Inputs.GoogleDriveRootFolderId, {
        required: true,
    });
    const fileID = await findFileID(drivePath, rootFolderID, googleDriveService);
    core.setOutput(constants_1.Outputs.FileID, fileID);
}
exports.findImpl = findImpl;
async function findFileID(drivePath, parentFolderID, driveService) {
    const pathFragments = drivePath
        .replaceAll(new RegExp(`\\${node_path_1.default.sep}`, 'g'), '/')
        .split('/')
        .filter((x) => x !== '');
    for (const pathFragment of pathFragments) {
        const fileID = await driveService.findFileIDByName(parentFolderID, pathFragment);
        if (!fileID) {
            throw new exceptions_1.FileNotFoundException(`File not found: ${drivePath}`);
        }
        parentFolderID = fileID;
    }
    return parentFolderID;
}
exports.findFileID = findFileID;
//# sourceMappingURL=find-impl.js.map