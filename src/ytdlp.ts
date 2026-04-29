// src/ytdlp.ts — Wrapper que localiza o descarga yt-dlp automáticamente
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as https from "https";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const YTDLP_URL = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe";
const YTDLP_DIR = path.join(os.homedir(), ".yt-mp3-downloader");
const YTDLP_PATH = path.join(YTDLP_DIR, "yt-dlp.exe");

// ─── Descarga yt-dlp si no existe ────────────────────────────────────────────

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const request = (redirectUrl: string) => {
      https.get(redirectUrl, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          request(res.headers.location!);
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

export async function ensureYtDlp(onStatus?: (msg: string) => void): Promise<string> {
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
    if (fs.existsSync(candidate)) return candidate;
  }

  // 3. Descargar automáticamente
  onStatus?.("yt-dlp.exe no encontrado. Descargando desde GitHub…");
  fs.mkdirSync(YTDLP_DIR, { recursive: true });

  try {
    await downloadFile(YTDLP_URL, YTDLP_PATH);
    onStatus?.(`yt-dlp descargado en: ${YTDLP_PATH}`);
    return YTDLP_PATH;
  } catch (err) {
    throw new Error(
      `No se pudo descargar yt-dlp automáticamente.\n` +
      `Descárgalo manualmente de https://github.com/yt-dlp/yt-dlp/releases\n` +
      `y colócalo en: ${YTDLP_PATH}\n` +
      `Error: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

// ─── Ejecutar yt-dlp con flags ────────────────────────────────────────────────

export async function runYtDlp(
  ytdlpPath: string,
  url: string | string[],
  flags: Record<string, unknown>
): Promise<string> {
  const args: string[] = [];

  // Convertir flags a argumentos CLI
  for (const [key, value] of Object.entries(flags)) {
    if (value === true) {
      args.push(`--${key}`);
    } else if (value !== false && value !== undefined && value !== null) {
      args.push(`--${key}`, String(value));
    }
  }

  // Añadir URLs
  if (Array.isArray(url)) {
    args.push(...url.filter(Boolean));
  } else if (url) {
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

export function parseVideoInfo(stdout: string): Record<string, unknown> {
  try {
    return JSON.parse(stdout.trim());
  } catch {
    throw new Error("No se pudo parsear la respuesta de yt-dlp. Respuesta: " + stdout.substring(0, 200));
  }
}
