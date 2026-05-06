import type { DownloadConfig, DownloadResult } from "./types.js";
export interface ParallelCallbacks {
    onStart?: (query: string, index: number, total: number) => void;
    onResult?: (result: DownloadResult, index: number, total: number) => void;
    onProgress?: (msg: string) => void;
}
/**
 * Descarga una lista de queries en paralelo con un limite de concurrencia.
 * Cada query puede ser una URL de YouTube o "ytsearch1:artista - cancion"
 */
export declare function downloadParallel(queries: string[], config: DownloadConfig, concurrency?: number, callbacks?: ParallelCallbacks): Promise<DownloadResult[]>;
//# sourceMappingURL=parallel.d.ts.map