import * as fs from "fs";
import * as path from "path";
// @ts-ignore
import ffmpegPath from "ffmpeg-static";
import { ensureYtDlp, runYtDlp, parseVideoInfo } from "./ytdlp.js";
import type { DownloadConfig, DownloadResult, VideoInfo } from "./types.js";

let ytdlpBin: string | null = null;

export async function initYtDlp(onStatus?: (msg: string) => void): Promise<void> {
  ytdlpBin = await ensureYtDlp(onStatus);
}

function getBin(): string {
  if (!ytdlpBin) throw new Error("yt-dlp no inicializado.");
  return ytdlpBin;
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
  const bin = getBin();
  const base: Record<string, unknown> = { "dump-single-json": true, "no-warnings": true, "no-playlist": true };
  if (config.cookiesFromBrowser !== "none") base["cookies-from-browser"] = config.cookiesFromBrowser;
  
  const stdout = await runYtDlp(bin, url, { ...base, "extractor-args": `youtube:player_client=${config.playerClient}` });
  return parseVideoInfo(stdout) as unknown as VideoInfo;
}

export async function downloadVideo(url: string, config: DownloadConfig, onProgress?: (msg: string) => void): Promise<DownloadResult> {
  const bin = getBin();
  ensureDir(config.outputDir);

  let info: VideoInfo;
  try {
    onProgress?.("Obteniendo información...");
    info = await fetchVideoInfo(url, config);
  } catch (err) {
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
  const dlFlags: Record<string, unknown> = {
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
    if (config.cookiesFromBrowser !== "none") dlFlags["cookies-from-browser"] = config.cookiesFromBrowser;

    await runYtDlp(bin, url, dlFlags);
    const tmpPath = path.join(config.outputDir, `${id}.${config.format}`);
    if (fs.existsSync(tmpPath)) fs.renameSync(tmpPath, targetPath);

    return { url, title, status: "success", outputPath: targetPath };
  } catch (err) {
    return { url, title, status: "error", errorMessage: String(err) };
  }
}

export async function expandPlaylist(url: string, config: DownloadConfig): Promise<string[]> {
  const bin = getBin();
  const stdout = await runYtDlp(bin, url, { "flat-playlist": true, "print": "%(id)s", "no-warnings": true });
  return stdout.split(/\r?\n/).map(s => s.trim()).filter(Boolean).map(id => `https://www.youtube.com/watch?v=${id}`);
}

export async function downloadBatch(urls: string[], config: DownloadConfig, callbacks: any): Promise<DownloadResult[]> {
  const results: DownloadResult[] = [];
  for (let i = 0; i < urls.length; i++) {
    callbacks.onStart?.(urls[i], i, urls.length);
    const result = await downloadVideo(urls[i], config, callbacks.onProgress);
    results.push(result);
    callbacks.onResult?.(result, i, urls.length);
  }
  return results;
}

export function readUrlsFromFile(filePath: string): string[] {
  return fs.readFileSync(filePath, "utf-8").split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith("#"));
}