"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadParallel = downloadParallel;
// src/parallel.ts — Descarga en paralelo con concurrencia configurable
const downloader_js_1 = require("./downloader.js");
/**
 * Descarga una lista de queries en paralelo con un limite de concurrencia.
 * Cada query puede ser una URL de YouTube o "ytsearch1:artista - cancion"
 */
async function downloadParallel(queries, config, concurrency = 4, callbacks = {}) {
    const results = new Array(queries.length);
    const total = queries.length;
    let index = 0;
    let completed = 0;
    async function worker() {
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
            const result = await (0, downloader_js_1.downloadVideo)(url, config, (msg) => {
                callbacks.onProgress?.(`[${i + 1}/${total}] ${msg}`);
            });
            results[i] = result;
            completed++;
            callbacks.onResult?.(result, i, total);
        }
    }
    // Lanzar N workers en paralelo
    const workers = [];
    for (let w = 0; w < Math.min(concurrency, total); w++) {
        workers.push(worker());
    }
    await Promise.all(workers);
    return results;
}
//# sourceMappingURL=parallel.js.map