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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInputAsString = exports.getInputAsBool = exports.getInputAsInt = exports.getInputAsArray = exports.logWarning = exports.isGhes = void 0;
const core = __importStar(require("@actions/core"));
function isGhes() {
    const ghUrl = new URL(process.env['GITHUB_SERVER_URL'] ?? 'https://github.com');
    return ghUrl.hostname.toUpperCase() !== 'GITHUB.COM';
}
exports.isGhes = isGhes;
function logWarning(message) {
    const warningPrefix = '[warning]';
    core.info(`${warningPrefix}${message}`);
}
exports.logWarning = logWarning;
function getInputAsArray(name, options) {
    return core
        .getInput(name, options)
        .split('\n')
        .map((s) => s.replace(/^!\s+/, '!').trim())
        .filter((x) => x !== '');
}
exports.getInputAsArray = getInputAsArray;
function getInputAsInt(name, options) {
    const value = Number.parseInt(core.getInput(name, options));
    if (Number.isNaN(value) || value < 0) {
        return undefined;
    }
    return value;
}
exports.getInputAsInt = getInputAsInt;
function getInputAsBool(name, options) {
    const result = core.getInput(name, options);
    return result.toLowerCase() === 'true';
}
exports.getInputAsBool = getInputAsBool;
function getInputAsString(name, options) {
    return core.getInput(name, options) ?? '';
}
exports.getInputAsString = getInputAsString;
//# sourceMappingURL=action-utils.js.map