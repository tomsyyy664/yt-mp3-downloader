// src/downloader.ts
import * as fs from "fs";
import * as path from "path";
import { ensureBinaries, runYtDlp, parseVideoInfo } from "./ytdlp.js";
import type { Binaries } from "./ytdlp.js";
import type { DownloadConfig, DownloadResult, VideoInfo } from "./types.js";

let bins: Binaries | null = null;

export async function initYtDlp(onStatus?: (msg: string) => void): Promise<void> {
  bins = await ensureBinaries(onStatus ?? (() => {}));
}

function getBins(): Binaries {
  if (!bins) throw new Error("Binarios no inicializados.");
  return bins;
}

export function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export function sanitizeTitle(title: string): string {
  return (title || "audio")
    .replace(/[<>:"/\\|?*\x00-\x1f]+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 150);
}

export function buildOutputBaseName(title: string, id: string, includeId: boolean): string {
  const safe = sanitizeTitle(title);
  return includeId && id ? `${safe} [${id}]` : safe;
}

function findLatestFileByExt(dir: string, ext: string): string | null {
  try {
    const files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith(`.${ext}`));
    let pick: string | null = null;
    let maxTime = -1;
    for (const f of files) {
      const stat = fs.statSync(path.join(dir, f));
      if (stat.mtimeMs > maxTime) { maxTime = stat.mtimeMs; pick = f; }
    }
    return pick ? path.join(dir, pick) : null;
  } catch { return null; }
}

export function alreadyDownloaded(dir: string, title: string, id: string, format: string, includeId: boolean): boolean {
  const candidates = [
    path.join(dir, `${buildOutputBaseName(title, id, true)}.${format}`),
    path.join(dir, `${buildOutputBaseName(title, id, false)}.${format}`),
    path.join(dir, `${buildOutputBaseName(title, id, includeId)}.${format}`),
  ];
  return candidates.some(p => fs.existsSync(p));
}

async function fetchVideoInfo(url: string, config: DownloadConfig): Promise<VideoInfo> {
  const { ytdlp } = getBins();
  const base: Record<string, unknown> = {
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
      const stdout = await runYtDlp(ytdlp, url, {
        ...base,
        "extractor-args": `youtube:player_client=${client}`,
      });
      return parseVideoInfo(stdout) as unknown as VideoInfo;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  try {
    const stdout = await runYtDlp(ytdlp, url, base);
    return parseVideoInfo(stdout) as unknown as VideoInfo;
  } catch (err) {
    lastError = err instanceof Error ? err : new Error(String(err));
  }

  throw new Error(
    "No se pudo obtener informacion del video. " +
    "Verifica la URL y tu conexion a internet. " +
    `Ultimo error: ${lastError.message}`
  );
}

export async function downloadVideo(
  url: string,
  config: DownloadConfig,
  onProgress?: (msg: string) => void
): Promise<DownloadResult> {
  const { ytdlp, ffmpeg } = getBins();

  try {
    ensureDir(config.outputDir);
  } catch (err) {
    return {
      url, title: "Desconocido", status: "error",
      errorMessage: `No se pudo crear la carpeta "${config.outputDir}": ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  let info: VideoInfo;
  try {
    onProgress?.("Obteniendo informacion del video...");
    info = await fetchVideoInfo(url, config);
  } catch (err) {
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

    const dlFlags: Record<string, unknown> = {
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

    await runYtDlp(ytdlp, url, dlFlags);

    const tmpPath = path.join(config.outputDir, `${id}.${config.format}`);
    let finalPath = fs.existsSync(tmpPath)
      ? tmpPath
      : findLatestFileByExt(config.outputDir, config.format);

    if (!finalPath || !fs.existsSync(finalPath)) {
      throw new Error("No se encontro el archivo de audio tras la descarga.");
    }

    if (path.resolve(finalPath) !== path.resolve(targetPath)) {
      try { fs.renameSync(finalPath, targetPath); finalPath = targetPath; } catch { /* ok */ }
    }

    return { url, title, status: "success", outputPath: finalPath };
  } catch (err) {
    return {
      url, title, status: "error",
      errorMessage: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function expandPlaylist(url: string, config: DownloadConfig): Promise<string[]> {
  const isPlaylist = /[?&]list=/.test(url) || /\/playlist\?/.test(url);
  if (!isPlaylist) return [url];

  const { ytdlp } = getBins();
  const flags: Record<string, unknown> = {
    "flat-playlist": true,
    "print": "%(id)s",
    "no-warnings": true,
  };
  if (config.cookiesFromBrowser !== "none") flags["cookies-from-browser"] = config.cookiesFromBrowser;

  const stdout = await runYtDlp(ytdlp, url, flags);
  return stdout.split(/\r?\n/).map((s: string) => s.trim()).filter(Boolean)
    .map((id: string) => `https://www.youtube.com/watch?v=${id}`);
}

export async function downloadBatch(
  urls: string[],
  config: DownloadConfig,
  callbacks: {
    onStart?: (url: string, index: number, total: number) => void;
    onResult?: (result: DownloadResult, index: number, total: number) => void;
    onProgress?: (msg: string) => void;
  }
): Promise<DownloadResult[]> {
  const results: DownloadResult[] = [];
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i].trim();
    if (!url || url.startsWith("#")) continue;
    callbacks.onStart?.(url, i, urls.length);
    const result = await downloadVideo(url, config, callbacks.onProgress);
    results.push(result);
    callbacks.onResult?.(result, i, urls.length);
  }
  return results;
}

export function readUrlsFromFile(filePath: string): string[] {
  if (!fs.existsSync(filePath)) throw new Error(`Archivo no encontrado: ${filePath}`);
  return fs.readFileSync(filePath, "utf-8")
    .split(/\r?\n/).map((l: string) => l.trim()).filter((l: string) => l && !l.startsWith("#"));
}
