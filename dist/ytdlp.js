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
exports.APP_DIR = void 0;
exports.ensureBinaries = ensureBinaries;
exports.flushAppDir = flushAppDir;
exports.runYtDlp = runYtDlp;
exports.parseVideoInfo = parseVideoInfo;
// src/ytdlp.ts — Localiza o descarga yt-dlp y ffmpeg secuencialmente
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const https = __importStar(require("https"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const execFileAsync = (0, util_1.promisify)(child_process_1.execFile);
const execAsync = (0, util_1.promisify)(child_process_1.exec);
exports.APP_DIR = path.join(os.homedir(), ".yt-mp3-downloader");
const YTDLP_PATH = path.join(exports.APP_DIR, "yt-dlp.exe");
const FFMPEG_PATH = path.join(exports.APP_DIR, "ffmpeg.exe");
const YTDLP_URL = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe";
const FFMPEG_URL = "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip";
// ─── Descarga un archivo siguiendo redirecciones ──────────────────────────────
function downloadFile(url, dest, onProgress) {
    return new Promise((resolve, reject) => {
        const follow = (currentUrl, hops = 0) => {
            if (hops > 10) {
                reject(new Error("Demasiadas redirecciones"));
                return;
            }
            https.get(currentUrl, { headers: { "User-Agent": "yt-mp3-downloader/1.0" } }, (res) => {
                if ([301, 302, 307, 308].includes(res.statusCode)) {
                    follow(res.headers.location, hops + 1);
                    return;
                }
                if (res.statusCode !== 200) {
                    reject(new Error(`HTTP ${res.statusCode} descargando ${currentUrl}`));
                    return;
                }
                const total = parseInt(res.headers["content-length"] ?? "0", 10);
                let received = 0;
                const file = fs.createWriteStream(dest);
                res.on("data", (chunk) => {
                    received += chunk.length;
                    if (total > 0)
                        onProgress?.(Math.round((received / total) * 100));
                });
                res.pipe(file);
                file.on("finish", () => file.close(() => resolve()));
                file.on("error", (e) => { try {
                    fs.unlinkSync(dest);
                }
                catch { } reject(e); });
            }).on("error", reject);
        };
        follow(url);
    });
}
// ─── Extraer ffmpeg.exe del zip ───────────────────────────────────────────────
async function extractFfmpegFromZip(zipPath) {
    const tmpDir = path.join(exports.APP_DIR, "_ffmpeg_tmp");
    fs.mkdirSync(tmpDir, { recursive: true });
    try {
        await execAsync(`powershell -NoProfile -Command "Expand-Archive -LiteralPath '${zipPath}' -DestinationPath '${tmpDir}' -Force"`, { timeout: 120000 });
    }
    catch (err) {
        throw new Error("No se pudo extraer ffmpeg.zip. Asegurate de tener PowerShell disponible.\n" +
            (err instanceof Error ? err.message : String(err)));
    }
    const findExe = (dir, name) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isFile() && entry.name === name)
                return full;
            if (entry.isDirectory()) {
                const found = findExe(full, name);
                if (found)
                    return found;
            }
        }
        return null;
    };
    const found = findExe(tmpDir, "ffmpeg.exe");
    if (!found)
        throw new Error("ffmpeg.exe no encontrado dentro del zip.");
    fs.copyFileSync(found, FFMPEG_PATH);
    fs.rmSync(tmpDir, { recursive: true, force: true });
    try {
        fs.unlinkSync(zipPath);
    }
    catch { }
}
// ─── Descargar ffmpeg (separado de yt-dlp) ───────────────────────────────────
async function ensureFfmpegBin(onStatus) {
    if (fs.existsSync(FFMPEG_PATH))
        return FFMPEG_PATH;
    // Buscar en node_modules
    const nmCandidates = [
        path.join(process.cwd(), "node_modules", "ffmpeg-static", "ffmpeg.exe"),
        path.join(process.cwd(), "node_modules", ".pnpm", "ffmpeg-static@5.2.0", "node_modules", "ffmpeg-static", "ffmpeg.exe"),
        path.join(process.cwd(), "node_modules", ".pnpm", "ffmpeg-static@5.3.0", "node_modules", "ffmpeg-static", "ffmpeg.exe"),
    ];
    for (const c of nmCandidates) {
        if (fs.existsSync(c))
            return c;
    }
    // Buscar en PATH del sistema
    try {
        const { stdout } = await execAsync("where ffmpeg");
        const p = stdout.trim().split(/\r?\n/)[0].trim();
        if (fs.existsSync(p))
            return p;
    }
    catch { /* no en PATH */ }
    // Descargar ffmpeg primero (es mas pesado)
    onStatus("Descargando ffmpeg desde GitHub (puede tardar 1-2 minutos)...");
    fs.mkdirSync(exports.APP_DIR, { recursive: true });
    const zipPath = path.join(exports.APP_DIR, "ffmpeg.zip");
    try {
        await downloadFile(FFMPEG_URL, zipPath, (pct) => {
            process.stdout.write(`\r  [ffmpeg] ${pct}%   `);
        });
        process.stdout.write("\n");
    }
    catch (err) {
        throw new Error("No se pudo descargar ffmpeg.\nComprueba tu conexion a internet.\n" +
            (err instanceof Error ? err.message : String(err)));
    }
    onStatus("Extrayendo ffmpeg.exe...");
    await extractFfmpegFromZip(zipPath);
    onStatus("ffmpeg listo: " + FFMPEG_PATH);
    return FFMPEG_PATH;
}
// ─── Descargar yt-dlp (separado de ffmpeg) ───────────────────────────────────
async function ensureYtDlpBin(onStatus) {
    if (fs.existsSync(YTDLP_PATH))
        return YTDLP_PATH;
    // Buscar en node_modules
    const nmCandidates = [
        path.join(process.cwd(), "node_modules", "yt-dlp-exec", "bin", "yt-dlp.exe"),
        path.join(process.cwd(), "node_modules", ".pnpm", "yt-dlp-exec@1.0.2", "node_modules", "yt-dlp-exec", "bin", "yt-dlp.exe"),
    ];
    for (const c of nmCandidates) {
        if (fs.existsSync(c))
            return c;
    }
    // Descargar yt-dlp despues de ffmpeg
    onStatus("Descargando yt-dlp desde GitHub...");
    fs.mkdirSync(exports.APP_DIR, { recursive: true });
    try {
        await downloadFile(YTDLP_URL, YTDLP_PATH, (pct) => {
            process.stdout.write(`\r  [yt-dlp] ${pct}%   `);
        });
        process.stdout.write("\n");
    }
    catch (err) {
        throw new Error("No se pudo descargar yt-dlp.\nComprueba tu conexion a internet.\n" +
            (err instanceof Error ? err.message : String(err)));
    }
    onStatus("yt-dlp listo: " + YTDLP_PATH);
    return YTDLP_PATH;
}
// Descarga ffmpeg primero, luego yt-dlp (secuencial para no saturar el ancho de banda)
async function ensureBinaries(onStatus) {
    const ffmpeg = await ensureFfmpegBin(onStatus);
    const ytdlp = await ensureYtDlpBin(onStatus);
    return { ytdlp, ffmpeg };
}
// ─── Limpiar directorio de la app (~/.yt-mp3-downloader) ─────────────────────
function flushAppDir() {
    if (fs.existsSync(exports.APP_DIR)) {
        fs.rmSync(exports.APP_DIR, { recursive: true, force: true });
    }
}
// ─── Ejecutar yt-dlp ──────────────────────────────────────────────────────────
async function runYtDlp(ytdlpPath, url, flags) {
    const args = [];
    for (const [key, value] of Object.entries(flags)) {
        if (value === true) {
            args.push(`--${key}`);
        }
        else if (value !== false && value !== undefined && value !== null) {
            args.push(`--${key}`, String(value));
        }
    }
    if (Array.isArray(url)) {
        args.push(...url.filter(Boolean));
    }
    else if (url) {
        args.push(url);
    }
    try {
        const { stdout } = await execFileAsync(ytdlpPath, args, {
            maxBuffer: 50 * 1024 * 1024,
        });
        return stdout;
    }
    catch (err) {
        const detail = err.stderr ? `\n${String(err.stderr).substring(0, 500)}` : "";
        throw new Error((err.message ?? String(err)) + detail);
    }
}
function parseVideoInfo(stdout) {
    try {
        return JSON.parse(stdout.trim());
    }
    catch {
        throw new Error("No se pudo parsear la respuesta de yt-dlp. Respuesta: " + stdout.substring(0, 300));
    }
}
//# sourceMappingURL=ytdlp.js.map