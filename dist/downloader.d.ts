import type { DownloadConfig, DownloadResult } from "./types.js";
export declare function initYtDlp(onStatus?: (msg: string) => void): Promise<void>;
export declare function ensureDir(dir: string): void;
export declare function sanitizeTitle(title: string): string;
export declare function buildOutputBaseName(title: string, id: string, includeId: boolean): string;
export declare function alreadyDownloaded(dir: string, title: string, id: string, format: string, includeId: boolean): boolean;
export declare function downloadVideo(url: string, config: DownloadConfig, onProgress?: (msg: string) => void): Promise<DownloadResult>;
export declare function expandPlaylist(url: string, config: DownloadConfig): Promise<string[]>;
export declare function downloadBatch(urls: string[], config: DownloadConfig, callbacks: any): Promise<DownloadResult[]>;
export declare function readUrlsFromFile(filePath: string): string[];
//# sourceMappingURL=downloader.d.ts.map