// src/ytdlp.ts — Localiza o descarga yt-dlp y ffmpeg automáticamente
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as https from "https";
import { execFile, exec } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const execAsync = promisify(exec);

const APP_DIR = path.join(os.homedir(), ".yt-mp3-downloader");
const YTDLP_PATH = path.join(APP_DIR, "yt-dlp.exe");
const FFMPEG_PATH = path.join(APP_DIR, "ffmpeg.exe");

const YTDLP_URL =
  "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe";
const FFMPEG_URL =
  "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip";

// ─── Descarga un archivo siguiendo redirecciones ──────────────────────────────

function downloadFile(url: string, dest: string, onProgress?: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const follow = (currentUrl: string) => {
      https.get(currentUrl, { headers: { "User-Agent": "yt-mp3-downloader/1.0" } }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) {
          follow(res.headers.location!);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} descargando ${currentUrl}`));
          return;
        }
        const total = parseInt(res.headers["content-length"] ?? "0", 10);
        let received = 0;
        const file = fs.createWriteStream(dest);
        res.on("data", (chunk: Buffer) => {
          received += chunk.length;
          if (total > 0) onProgress?.(Math.round((received / total) * 100));
        });
        res.pipe(file);
        file.on("finish", () => file.close(() => resolve()));
        file.on("error", (e) => { fs.unlink(dest, () => {}); reject(e); });
      }).on("error", reject);
    };
    follow(url);
  });
}

// ─── Extraer ffmpeg.exe del zip usando PowerShell (sin dependencias extra) ───

async function extractFfmpegFromZip(zipPath: string, destDir: string): Promise<void> {
  // Usar PowerShell para descomprimir (disponible en Windows 5+)
  await execAsync(
    `powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${destDir}' -Force"`
  );

  // Buscar ffmpeg.exe dentro del zip extraído (puede estar en subcarpetas)
  const findFfmpeg = (dir: string): string | null => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isFile() && entry.name === "ffmpeg.exe") return fullPath;
      if (entry.isDirectory()) {
        const found = findFfmpeg(fullPath);
        if (found) return found;
      }
    }
    return null;
  };

  const tmpExtract = path.join(destDir, "_ffmpeg_extract");
  fs.mkdirSync(tmpExtract, { recursive: true });
  await execAsync(
    `powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${tmpExtract}' -Force"`
  );

  const ffmpegFound = findFfmpeg(tmpExtract);
  if (!ffmpegFound) throw new Error("ffmpeg.exe no encontrado dentro del zip.");

  fs.copyFileSync(ffmpegFound, FFMPEG_PATH);

  // Limpiar temporales
  fs.rmSync(tmpExtract, { recursive: true, force: true });
  fs.unlinkSync(zipPath);
}

// ─── Asegurar yt-dlp ──────────────────────────────────────────────────────────

async function ensureYtDlpBin(onStatus: (msg: string) => void): Promise<string> {
  if (fs.existsSync(YTDLP_PATH)) return YTDLP_PATH;

  // Buscar en node_modules (instalación con npm)
  const nmCandidates = [
    path.join(process.cwd(), "node_modules", "yt-dlp-exec", "bin", "yt-dlp.exe"),
    // pnpm hoisted
    path.join(process.cwd(), "node_modules", ".pnpm", "yt-dlp-exec@1.0.2", "node_modules", "yt-dlp-exec", "bin", "yt-dlp.exe"),
  ];
  for (const c of nmCandidates) {
    if (fs.existsSync(c)) return c;
  }

  onStatus("Descargando yt-dlp.exe desde GitHub...");
  fs.mkdirSync(APP_DIR, { recursive: true });
  await downloadFile(YTDLP_URL, YTDLP_PATH, (pct) => {
    process.stdout.write(`\r  yt-dlp: ${pct}%   `);
  });
  process.stdout.write("\n");
  onStatus(`yt-dlp descargado: ${YTDLP_PATH}`);
  return YTDLP_PATH;
}

// ─── Asegurar ffmpeg ──────────────────────────────────────────────────────────

async function ensureFfmpegBin(onStatus: (msg: string) => void): Promise<string> {
  if (fs.existsSync(FFMPEG_PATH)) return FFMPEG_PATH;

  // Buscar ffmpeg en node_modules (ffmpeg-static)
  const staticCandidates = [
    path.join(process.cwd(), "node_modules", "ffmpeg-static", "ffmpeg.exe"),
    path.join(process.cwd(), "node_modules", ".pnpm", "ffmpeg-static@5.3.0", "node_modules", "ffmpeg-static", "ffmpeg.exe"),
    path.join(process.cwd(), "node_modules", ".pnpm", "ffmpeg-static@5.2.0", "node_modules", "ffmpeg-static", "ffmpeg.exe"),
  ];
  for (const c of staticCandidates) {
    if (fs.existsSync(c)) return c;
  }

  // Buscar en PATH del sistema
  try {
    const { stdout } = await execAsync("where ffmpeg");
    const ffmpegSystem = stdout.trim().split("\n")[0].trim();
    if (fs.existsSync(ffmpegSystem)) return ffmpegSystem;
  } catch { /* no está en PATH */ }

  // Descargar
  onStatus("Descargando ffmpeg desde GitHub (puede tardar unos minutos)...");
  fs.mkdirSync(APP_DIR, { recursive: true });
  const zipPath = path.join(APP_DIR, "ffmpeg.zip");

  await downloadFile(FFMPEG_URL, zipPath, (pct) => {
    process.stdout.write(`\r  ffmpeg: ${pct}%   `);
  });
  process.stdout.write("\n");

  onStatus("Extrayendo ffmpeg.exe...");
  await extractFfmpegFromZip(zipPath, APP_DIR);
  onStatus(`ffmpeg descargado: ${FFMPEG_PATH}`);
  return FFMPEG_PATH;
}

// ─── API pública ──────────────────────────────────────────────────────────────

export interface Binaries {
  ytdlp: string;
  ffmpeg: string;
}

export async function ensureBinaries(onStatus: (msg: string) => void): Promise<Binaries> {
  const [ytdlp, ffmpeg] = await Promise.all([
    ensureYtDlpBin(onStatus),
    ensureFfmpegBin(onStatus),
  ]);
  return { ytdlp, ffmpeg };
}

// ─── Ejecutar yt-dlp ──────────────────────────────────────────────────────────

export async function runYtDlp(
  ytdlpPath: string,
  url: string | string[],
  flags: Record<string, unknown>
): Promise<string> {
  const args: string[] = [];

  for (const [key, value] of Object.entries(flags)) {
    if (value === true) {
      args.push(`--${key}`);
    } else if (value !== false && value !== undefined && value !== null) {
      args.push(`--${key}`, String(value));
    }
  }

  if (Array.isArray(url)) {
    args.push(...url.filter(Boolean));
  } else if (url) {
    args.push(url);
  }

  try {
    const { stdout } = await execFileAsync(ytdlpPath, args, {
      maxBuffer: 50 * 1024 * 1024,
    });
    return stdout;
  } catch (err: any) {
    // Incluir stderr en el mensaje de error para diagnóstico
    const detail = err.stderr ? `\n${err.stderr.substring(0, 500)}` : "";
    throw new Error((err.message ?? String(err)) + detail);
  }
}

export function parseVideoInfo(stdout: string): Record<string, unknown> {
  try {
    return JSON.parse(stdout.trim());
  } catch {
    throw new Error(
      "No se pudo parsear la respuesta de yt-dlp.\n" +
      "Respuesta recibida: " + stdout.substring(0, 300)
    );
  }
}
