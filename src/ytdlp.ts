// src/ytdlp.ts — Localiza o descarga yt-dlp y ffmpeg secuencialmente
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as https from "https";
import { execFile, exec } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const execAsync = promisify(exec);

export const APP_DIR = path.join(os.homedir(), ".yt-mp3-downloader");
const YTDLP_PATH = path.join(APP_DIR, "yt-dlp.exe");
const FFMPEG_PATH = path.join(APP_DIR, "ffmpeg.exe");

const YTDLP_URL = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe";
const FFMPEG_URL = "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip";

// ─── Descarga un archivo siguiendo redirecciones ──────────────────────────────

function downloadFile(url: string, dest: string, onProgress?: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const follow = (currentUrl: string, hops = 0) => {
      if (hops > 10) { reject(new Error("Demasiadas redirecciones")); return; }
      https.get(currentUrl, { headers: { "User-Agent": "yt-mp3-downloader/1.0" } }, (res) => {
        if ([301, 302, 307, 308].includes(res.statusCode!)) {
          follow(res.headers.location!, hops + 1);
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
        file.on("error", (e) => { try { fs.unlinkSync(dest); } catch {} reject(e); });
      }).on("error", reject);
    };
    follow(url);
  });
}

// ─── Extraer ffmpeg.exe del zip ───────────────────────────────────────────────

async function extractFfmpegFromZip(zipPath: string): Promise<void> {
  const tmpDir = path.join(APP_DIR, "_ffmpeg_tmp");
  fs.mkdirSync(tmpDir, { recursive: true });

  try {
    await execAsync(
      `powershell -NoProfile -Command "Expand-Archive -LiteralPath '${zipPath}' -DestinationPath '${tmpDir}' -Force"`,
      { timeout: 120000 }
    );
  } catch (err) {
    throw new Error(
      "No se pudo extraer ffmpeg.zip. Asegurate de tener PowerShell disponible.\n" +
      (err instanceof Error ? err.message : String(err))
    );
  }

  const findExe = (dir: string, name: string): string | null => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isFile() && entry.name === name) return full;
      if (entry.isDirectory()) {
        const found = findExe(full, name);
        if (found) return found;
      }
    }
    return null;
  };

  const found = findExe(tmpDir, "ffmpeg.exe");
  if (!found) throw new Error("ffmpeg.exe no encontrado dentro del zip.");

  fs.copyFileSync(found, FFMPEG_PATH);
  fs.rmSync(tmpDir, { recursive: true, force: true });
  try { fs.unlinkSync(zipPath); } catch {}
}

// ─── Descargar ffmpeg (separado de yt-dlp) ───────────────────────────────────

async function ensureFfmpegBin(onStatus: (msg: string) => void): Promise<string> {
  if (fs.existsSync(FFMPEG_PATH)) return FFMPEG_PATH;

  // Buscar en node_modules
  const nmCandidates = [
    path.join(process.cwd(), "node_modules", "ffmpeg-static", "ffmpeg.exe"),
    path.join(process.cwd(), "node_modules", ".pnpm", "ffmpeg-static@5.2.0", "node_modules", "ffmpeg-static", "ffmpeg.exe"),
    path.join(process.cwd(), "node_modules", ".pnpm", "ffmpeg-static@5.3.0", "node_modules", "ffmpeg-static", "ffmpeg.exe"),
  ];
  for (const c of nmCandidates) {
    if (fs.existsSync(c)) return c;
  }

  // Buscar en PATH del sistema
  try {
    const { stdout } = await execAsync("where ffmpeg");
    const p = stdout.trim().split(/\r?\n/)[0].trim();
    if (fs.existsSync(p)) return p;
  } catch { /* no en PATH */ }

  // Descargar ffmpeg primero (es mas pesado)
  onStatus("Descargando ffmpeg desde GitHub (puede tardar 1-2 minutos)...");
  fs.mkdirSync(APP_DIR, { recursive: true });
  const zipPath = path.join(APP_DIR, "ffmpeg.zip");

  try {
    await downloadFile(FFMPEG_URL, zipPath, (pct) => {
      process.stdout.write(`\r  [ffmpeg] ${pct}%   `);
    });
    process.stdout.write("\n");
  } catch (err) {
    throw new Error(
      "No se pudo descargar ffmpeg.\nComprueba tu conexion a internet.\n" +
      (err instanceof Error ? err.message : String(err))
    );
  }

  onStatus("Extrayendo ffmpeg.exe...");
  await extractFfmpegFromZip(zipPath);
  onStatus("ffmpeg listo: " + FFMPEG_PATH);
  return FFMPEG_PATH;
}

// ─── Descargar yt-dlp (separado de ffmpeg) ───────────────────────────────────

async function ensureYtDlpBin(onStatus: (msg: string) => void): Promise<string> {
  if (fs.existsSync(YTDLP_PATH)) return YTDLP_PATH;

  // Buscar en node_modules
  const nmCandidates = [
    path.join(process.cwd(), "node_modules", "yt-dlp-exec", "bin", "yt-dlp.exe"),
    path.join(process.cwd(), "node_modules", ".pnpm", "yt-dlp-exec@1.0.2", "node_modules", "yt-dlp-exec", "bin", "yt-dlp.exe"),
  ];
  for (const c of nmCandidates) {
    if (fs.existsSync(c)) return c;
  }

  // Descargar yt-dlp despues de ffmpeg
  onStatus("Descargando yt-dlp desde GitHub...");
  fs.mkdirSync(APP_DIR, { recursive: true });

  try {
    await downloadFile(YTDLP_URL, YTDLP_PATH, (pct) => {
      process.stdout.write(`\r  [yt-dlp] ${pct}%   `);
    });
    process.stdout.write("\n");
  } catch (err) {
    throw new Error(
      "No se pudo descargar yt-dlp.\nComprueba tu conexion a internet.\n" +
      (err instanceof Error ? err.message : String(err))
    );
  }

  onStatus("yt-dlp listo: " + YTDLP_PATH);
  return YTDLP_PATH;
}

// ─── API publica ──────────────────────────────────────────────────────────────

export interface Binaries {
  ytdlp: string;
  ffmpeg: string;
}

// Descarga ffmpeg primero, luego yt-dlp (secuencial para no saturar el ancho de banda)
export async function ensureBinaries(onStatus: (msg: string) => void): Promise<Binaries> {
  const ffmpeg = await ensureFfmpegBin(onStatus);
  const ytdlp = await ensureYtDlpBin(onStatus);
  return { ytdlp, ffmpeg };
}

// ─── Limpiar directorio de la app (~/.yt-mp3-downloader) ─────────────────────

export function flushAppDir(): void {
  if (fs.existsSync(APP_DIR)) {
    fs.rmSync(APP_DIR, { recursive: true, force: true });
  }
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
    const detail = err.stderr ? `\n${String(err.stderr).substring(0, 500)}` : "";
    throw new Error((err.message ?? String(err)) + detail);
  }
}

export function parseVideoInfo(stdout: string): Record<string, unknown> {
  try {
    return JSON.parse(stdout.trim());
  } catch {
    throw new Error(
      "No se pudo parsear la respuesta de yt-dlp. Respuesta: " + stdout.substring(0, 300)
    );
  }
}
