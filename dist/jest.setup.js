"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jest_fail_on_console_1 = __importDefault(require("jest-fail-on-console"));
// Fail when console logs something inside a test - use spyOn instead
(0, jest_fail_on_console_1.default)({
    shouldFailOnWarn: true,
    shouldFailOnError: true,
    shouldFailOnLog: true,
    shouldFailOnAssert: true,
});
//# sourceMappingURL=jest.setup.js.map