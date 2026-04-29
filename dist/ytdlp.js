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
exports.ensureYtDlp = ensureYtDlp;
exports.runYtDlp = runYtDlp;
exports.parseVideoInfo = parseVideoInfo;
// src/ytdlp.ts — Wrapper que localiza o descarga yt-dlp automáticamente
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const https = __importStar(require("https"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const execFileAsync = (0, util_1.promisify)(child_process_1.execFile);
const YTDLP_URL = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe";
const YTDLP_DIR = path.join(os.homedir(), ".yt-mp3-downloader");
const YTDLP_PATH = path.join(YTDLP_DIR, "yt-dlp.exe");
// ─── Descarga yt-dlp si no existe ────────────────────────────────────────────
function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        const request = (redirectUrl) => {
            https.get(redirectUrl, (res) => {
                if (res.statusCode === 301 || res.statusCode === 302) {
                    request(res.headers.location);
                    return;
                }
                if (res.statusCode !== 200) {
                    reject(new Error(`HTTP ${res.statusCode} al descargar yt-dlp`));
                    return;
                }
                res.pipe(file);
                file.on("finish", () => file.close(() => resolve()));
                file.on("error", reject);
            }).on("error", reject);
        };
        request(url);
    });
}
async function ensureYtDlp(onStatus) {
    // 1. Buscar en ubicación propia (~/.yt-mp3-downloader/yt-dlp.exe)
    if (fs.existsSync(YTDLP_PATH)) {
        return YTDLP_PATH;
    }
    // 2. Buscar en node_modules (instalación normal)
    const candidates = [
        path.join(process.cwd(), "node_modules", "yt-dlp-exec", "bin", "yt-dlp.exe"),
        path.join(process.cwd(), "node_modules", ".pnpm", "yt-dlp-exec@1.0.2", "node_modules", "yt-dlp-exec", "bin", "yt-dlp.exe"),
    ];
    for (const candidate of candidates) {
        if (fs.existsSync(candidate))
            return candidate;
    }
    // 3. Descargar automáticamente
    onStatus?.("yt-dlp.exe no encontrado. Descargando desde GitHub…");
    fs.mkdirSync(YTDLP_DIR, { recursive: true });
    try {
        await downloadFile(YTDLP_URL, YTDLP_PATH);
        onStatus?.(`yt-dlp descargado en: ${YTDLP_PATH}`);
        return YTDLP_PATH;
    }
    catch (err) {
        throw new Error(`No se pudo descargar yt-dlp automáticamente.\n` +
            `Descárgalo manualmente de https://github.com/yt-dlp/yt-dlp/releases\n` +
            `y colócalo en: ${YTDLP_PATH}\n` +
            `Error: ${err instanceof Error ? err.message : String(err)}`);
    }
}
// ─── Ejecutar yt-dlp con flags ────────────────────────────────────────────────
async function runYtDlp(ytdlpPath, url, flags) {
    const args = [];
    // Convertir flags a argumentos CLI
    for (const [key, value] of Object.entries(flags)) {
        if (value === true) {
            args.push(`--${key}`);
        }
        else if (value !== false && value !== undefined && value !== null) {
            args.push(`--${key}`, String(value));
        }
    }
    // Añadir URLs
    if (Array.isArray(url)) {
        args.push(...url.filter(Boolean));
    }
    else if (url) {
        args.push(url);
    }
    const { stdout, stderr } = await execFileAsync(ytdlpPath, args, {
        maxBuffer: 50 * 1024 * 1024, // 50MB para JSON grandes
    });
    if (stderr && !flags["no-warnings"]) {
        // Solo mostrar stderr si no es un warning esperado
    }
    return stdout;
}
// ─── Parsear JSON de dump-single-json ────────────────────────────────────────
function parseVideoInfo(stdout) {
    try {
        return JSON.parse(stdout.trim());
    }
    catch {
        throw new Error("No se pudo parsear la respuesta de yt-dlp. Respuesta: " + stdout.substring(0, 200));
    }
}
//# sourceMappingURL=ytdlp.js.map