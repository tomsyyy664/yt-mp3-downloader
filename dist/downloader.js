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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const ytdlp_js_1 = require("./ytdlp.js");
let ytdlpBin = null;
async function initYtDlp(onStatus) {
    ytdlpBin = await (0, ytdlp_js_1.ensureYtDlp)(onStatus);
}
function getBin() {
    if (!ytdlpBin)
        throw new Error("yt-dlp no inicializado.");
    return ytdlpBin;
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
    const bin = getBin();
    const base = { "dump-single-json": true, "no-warnings": true, "no-playlist": true };
    if (config.cookiesFromBrowser !== "none")
        base["cookies-from-browser"] = config.cookiesFromBrowser;
    const stdout = await (0, ytdlp_js_1.runYtDlp)(bin, url, { ...base, "extractor-args": `youtube:player_client=${config.playerClient}` });
    return (0, ytdlp_js_1.parseVideoInfo)(stdout);
}
async function downloadVideo(url, config, onProgress) {
    const bin = getBin();
    ensureDir(config.outputDir);
    let info;
    try {
        onProgress?.("Obteniendo información...");
        info = await fetchVideoInfo(url, config);
    }
    catch (err) {
        return { url, title: "Error", status: "error", errorMessage: String(err) };
    }
    const { id, title } = info;
    const baseName = buildOutputBaseName(title, id, config.includeIdInFilename);
    const targetPath = path.join(config.outputDir, `${baseName}.${config.format}`);
    if (alreadyDownloaded(config.outputDir, title, id, config.format, config.includeIdInFilename)) {
        return { url, title, status: "skipped", outputPath: targetPath };
    }
    try {
        onProgress?.(`Descargando: ${title}`);
        // Buscamos la ruta real que entiende Windows
        const dlFlags = {
            "extract-audio": true,
            "audio-format": "mp3",
            "audio-quality": "0",
            // Apunta al archivo que acabas de pegar en la raíz
            "ffmpeg-location": path.resolve(process.cwd(), "ffmpeg.exe"),
            "output": path.join(config.outputDir, "%(title)s.%(ext)s"),
            "no-playlist": true,
            "extractor-args": "youtube:player_client=web",
            "retries": 5,
        };
        if (config.cookiesFromBrowser !== "none")
            dlFlags["cookies-from-browser"] = config.cookiesFromBrowser;
        await (0, ytdlp_js_1.runYtDlp)(bin, url, dlFlags);
        const tmpPath = path.join(config.outputDir, `${id}.${config.format}`);
        if (fs.existsSync(tmpPath))
            fs.renameSync(tmpPath, targetPath);
        return { url, title, status: "success", outputPath: targetPath };
    }
    catch (err) {
        return { url, title, status: "error", errorMessage: String(err) };
    }
}
async function expandPlaylist(url, config) {
    const bin = getBin();
    const stdout = await (0, ytdlp_js_1.runYtDlp)(bin, url, { "flat-playlist": true, "print": "%(id)s", "no-warnings": true });
    return stdout.split(/\r?\n/).map(s => s.trim()).filter(Boolean).map(id => `https://www.youtube.com/watch?v=${id}`);
}
async function downloadBatch(urls, config, callbacks) {
    const results = [];
    for (let i = 0; i < urls.length; i++) {
        callbacks.onStart?.(urls[i], i, urls.length);
        const result = await downloadVideo(urls[i], config, callbacks.onProgress);
        results.push(result);
        callbacks.onResult?.(result, i, urls.length);
    }
    return results;
}
function readUrlsFromFile(filePath) {
    return fs.readFileSync(filePath, "utf-8").split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith("#"));
}
//# sourceMappingURL=downloader.js.map