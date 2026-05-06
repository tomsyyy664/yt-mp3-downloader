"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.initYtDlp = initYtDlp;
exports.ensureDir = ensureDir;
exports.sanitizeTitle = sanitizeTitle;
exports.buildOutputBaseName = buildOutputBaseName;
exports.alreadyDownloaded = alreadyDownloaded;
exports.downloadVideo = downloadVideo;
exports.expandPlaylist = expandPlaylist;
exports.downloadBatch = downloadBatch;
exports.readUrlsFromFile = readUrlsFromFile;
// src/downloader.ts
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const ytdlp_js_1 = require("./ytdlp.js");
let bins = null;
async function initYtDlp(onStatus) {
    bins = await (0, ytdlp_js_1.ensureBinaries)(onStatus ?? (() => { }));
}
function getBins() {
    if (!bins)
        throw new Error("Binarios no inicializados.");
    return bins;
}
function ensureDir(dir) {
    if (!fs.existsSync(dir))
        fs.mkdirSync(dir, { recursive: true });
}
function sanitizeTitle(title) {
    return (title || "audio")
        .replace(/[<>:"/\\|?*\x00-\x1f]+/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .substring(0, 150);
}
function buildOutputBaseName(title, id, includeId) {
    const safe = sanitizeTitle(title);
    return includeId && id ? `${safe} [${id}]` : safe;
}
function findLatestFileByExt(dir, ext) {
    try {
        const files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith(`.${ext}`));
        let pick = null;
        let maxTime = -1;
        for (const f of files) {
            const stat = fs.statSync(path.join(dir, f));
            if (stat.mtimeMs > maxTime) {
                maxTime = stat.mtimeMs;
                pick = f;
            }
        }
        return pick ? path.join(dir, pick) : null;
    }
    catch {
        return null;
    }
}
function alreadyDownloaded(dir, title, id, format, includeId) {
    const candidates = [
        path.join(dir, `${buildOutputBaseName(title, id, true)}.${format}`),
        path.join(dir, `${buildOutputBaseName(title, id, false)}.${format}`),
        path.join(dir, `${buildOutputBaseName(title, id, includeId)}.${format}`),
    ];
    return candidates.some(p => fs.existsSync(p));
}
async function fetchVideoInfo(url, config) {
    const { ytdlp } = getBins();
    const base = {
        "dump-single-json": true,
        "no-warnings": true,
        "no-playlist": true,
    };
    if (config.cookiesFromBrowser !== "none") {
        base["cookies-from-browser"] = config.cookiesFromBrowser;
    }
    const clients = ["android", "web", "tv_embedded", "mweb"];
    let lastError = new Error("Sin respuesta de yt-dlp");
    for (const client of clients) {
        try {
            const stdout = await (0, ytdlp_js_1.runYtDlp)(ytdlp, url, {
                ...base,
                "extractor-args": `youtube:player_client=${client}`,
            });
            return (0, ytdlp_js_1.parseVideoInfo)(stdout);
        }
        catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err));
        }
    }
    try {
        const stdout = await (0, ytdlp_js_1.runYtDlp)(ytdlp, url, base);
        return (0, ytdlp_js_1.parseVideoInfo)(stdout);
    }
    catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
    }
    throw new Error("No se pudo obtener informacion del video. " +
        "Verifica la URL y tu conexion a internet. " +
        `Ultimo error: ${lastError.message}`);
}
async function downloadVideo(url, config, onProgress) {
    const { ytdlp, ffmpeg } = getBins();
    try {
        ensureDir(config.outputDir);
    }
    catch (err) {
        return {
            url, title: "Desconocido", status: "error",
            errorMessage: `No se pudo crear la carpeta "${config.outputDir}": ${err instanceof Error ? err.message : String(err)}`,
        };
    }
    let info;
    try {
        onProgress?.("Obteniendo informacion del video...");
        info = await fetchVideoInfo(url, config);
    }
    catch (err) {
        return {
            url, title: "Desconocido", status: "error",
            errorMessage: err instanceof Error ? err.message : String(err),
        };
    }
    const { id, title } = info;
    const baseName = buildOutputBaseName(title, id, config.includeIdInFilename);
    const targetPath = path.join(config.outputDir, `${baseName}.${config.format}`);
    if (alreadyDownloaded(config.outputDir, title, id, config.format, config.includeIdInFilename)) {
        return { url, title, status: "skipped", outputPath: targetPath };
    }
    try {
        onProgress?.(`Descargando: ${title}`);
        const dlFlags = {
            "extract-audio": true,
            "audio-format": config.format,
            "audio-quality": config.quality,
            "ffmpeg-location": ffmpeg,
            "output": path.join(config.outputDir, "%(id)s.%(ext)s"),
            "no-playlist": true,
            "extractor-args": `youtube:player_client=${config.playerClient}`,
            "retries": 5,
        };
        if (config.cookiesFromBrowser !== "none") {
            dlFlags["cookies-from-browser"] = config.cookiesFromBrowser;
        }
        await (0, ytdlp_js_1.runYtDlp)(ytdlp, url, dlFlags);
        const tmpPath = path.join(config.outputDir, `${id}.${config.format}`);
        let finalPath = fs.existsSync(tmpPath)
            ? tmpPath
            : findLatestFileByExt(config.outputDir, config.format);
        if (!finalPath || !fs.existsSync(finalPath)) {
            throw new Error("No se encontro el archivo de audio tras la descarga.");
        }
        if (path.resolve(finalPath) !== path.resolve(targetPath)) {
            try {
                fs.renameSync(finalPath, targetPath);
                finalPath = targetPath;
            }
            catch { /* ok */ }
        }
        return { url, title, status: "success", outputPath: finalPath };
    }
    catch (err) {
        return {
            url, title, status: "error",
            errorMessage: err instanceof Error ? err.message : String(err),
        };
    }
}
async function expandPlaylist(url, config) {
    const isPlaylist = /[?&]list=/.test(url) || /\/playlist\?/.test(url);
    if (!isPlaylist)
        return [url];
    const { ytdlp } = getBins();
    const flags = {
        "flat-playlist": true,
        "print": "%(id)s",
        "no-warnings": true,
    };
    if (config.cookiesFromBrowser !== "none")
        flags["cookies-from-browser"] = config.cookiesFromBrowser;
    const stdout = await (0, ytdlp_js_1.runYtDlp)(ytdlp, url, flags);
    return stdout.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
        .map((id) => `https://www.youtube.com/watch?v=${id}`);
}
async function downloadBatch(urls, config, callbacks) {
    const results = [];
    for (let i = 0; i < urls.length; i++) {
        const url = urls[i].trim();
        if (!url || url.startsWith("#"))
            continue;
        callbacks.onStart?.(url, i, urls.length);
        const result = await downloadVideo(url, config, callbacks.onProgress);
        results.push(result);
        callbacks.onResult?.(result, i, urls.length);
    }
    return results;
}
function readUrlsFromFile(filePath) {
    if (!fs.existsSync(filePath))
        throw new Error(`Archivo no encontrado: ${filePath}`);
    return fs.readFileSync(filePath, "utf-8")
        .split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
}
//# sourceMappingURL=downloader.js.map