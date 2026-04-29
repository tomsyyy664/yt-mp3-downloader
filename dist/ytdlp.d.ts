export declare function ensureYtDlp(onStatus?: (msg: string) => void): Promise<string>;
export declare function runYtDlp(ytdlpPath: string, url: string | string[], flags: Record<string, unknown>): Promise<string>;
export declare function parseVideoInfo(stdout: string): Record<string, unknown>;
//# sourceMappingURL=ytdlp.d.ts.map