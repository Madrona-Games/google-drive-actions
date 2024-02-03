"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileNotFoundException = void 0;
class FileNotFoundException extends Error {
    constructor(message) {
        super(message);
        this.name = 'FileNotFoundException';
    }
}
exports.FileNotFoundException = FileNotFoundException;
//# sourceMappingURL=exceptions.js.map