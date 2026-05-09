export declare const APP_DIR: string;
export interface Binaries {
    ytdlp: string;
    ffmpeg: string;
}
export declare function ensureBinaries(onStatus: (msg: string) => void): Promise<Binaries>;
export declare function flushAppDir(): void;
export declare function runYtDlp(ytdlpPath: string, url: string | string[], flags: Record<string, unknown>): Promise<string>;
export declare function parseVideoInfo(stdout: string): Record<string, unknown>;
//# sourceMappingURL=ytdlp.d.ts.map