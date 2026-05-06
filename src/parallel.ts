// src/parallel.ts — Descarga en paralelo con concurrencia configurable
import { downloadVideo } from "./downloader.js";
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
export async function downloadParallel(
  queries: string[],
  config: DownloadConfig,
  concurrency: number = 4,
  callbacks: ParallelCallbacks = {}
): Promise<DownloadResult[]> {
  const results: DownloadResult[] = new Array(queries.length);
  const total = queries.length;
  let index = 0;
  let completed = 0;

  async function worker(): Promise<void> {
    while (index < total) {
      const i = index++;
      const query = queries[i].trim();
      if (!query || query.startsWith("#")) {
        results[i] = { url: query, title: query, status: "skipped" };
        completed++;
        continue;
      }

      // Convertir nombre de cancion a busqueda de YouTube si no es URL
      const url = query.startsWith("http")
        ? query
        : `ytsearch1:${query} audio`;

      callbacks.onStart?.(query, i, total);

      const result = await downloadVideo(url, config, (msg: string) => {
        callbacks.onProgress?.(`[${i + 1}/${total}] ${msg}`);
      });

      results[i] = result;
      completed++;
      callbacks.onResult?.(result, i, total);
    }
  }

  // Lanzar N workers en paralelo
  const workers: Promise<void>[] = [];
  for (let w = 0; w < Math.min(concurrency, total); w++) {
    workers.push(worker());
  }
  await Promise.all(workers);

  return results;
}
