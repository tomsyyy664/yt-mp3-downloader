import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import type { DownloadConfig } from "./types.js";

export function getDefaultOutputDir(): string {
  const home = os.homedir();
  const candidates = process.platform === "win32"
    ? [path.join(home, "Documents", "songs"), path.join(home, "songs")]
    : [path.join(home, "Documents", "songs"), path.join(home, "songs")];

  for (const candidate of candidates) {
    if (fs.existsSync(path.dirname(candidate))) return candidate;
  }
  return path.join(home, "songs");
}

export const DEFAULT_CONFIG: DownloadConfig = {
  outputDir: getDefaultOutputDir(),
  format: "mp3",
  quality: "0",
  includeIdInFilename: false,
  cookiesFromBrowser: "none",
  playerClient: "web", // ARREGLO PASO 2
  retries: 10,
};