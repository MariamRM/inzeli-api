export type ApiOk<T> = { ok: true; message: string; data: T };
export type ApiErr = { ok: false; message: string; code?: string };
export const ok = <T>(message: string, data: T): ApiOk<T> => ({ ok: true, message, data });
export const err = (message: string, code?: string): ApiErr => ({ ok: false, message, code });
//api.ts