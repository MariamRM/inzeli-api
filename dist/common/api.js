"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.err = exports.ok = void 0;
const ok = (message, data) => ({ ok: true, message, data });
exports.ok = ok;
const err = (message, code) => ({ ok: false, message, code });
exports.err = err;
//api.ts
//# sourceMappingURL=api.js.map