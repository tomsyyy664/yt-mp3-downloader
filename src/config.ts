// src/config.ts -- Configuración por defecto y paths de salida
import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import type { DownloadConfig } from "./types.js";

/**
 * Detecta la carpeta real de Documentos en Windows.
 * En Windows el sistema de ficheros usa "Documents" aunque el explorador
 * lo muestre como "Documentos" según el idioma del sistema.
 */
export function getDefaultOutputDir(): string {
  const home = os.homedir();

  const candidates =
    process.platform === "win32"
      ? [
          path.join(home, "Documents", "songs"),
          path.join(home, "Documentos", "songs"),
          path.join(home, "Mis documentos", "songs"),
          path.join(home, "songs"),
        ]
      : [
          path.join(home, "Documents", "songs"),
          path.join(home, "Documentos", "songs"),
          path.join(home, "songs"),
        ];

  // Usar la primera cuyo directorio padre ya existe
  for (const candidate of candidates) {
    if (fs.existsSync(path.dirname(candidate))) {
      return candidate;
    }
  }

  return path.join(home, "songs");
}

export const DEFAULT_CONFIG: DownloadConfig = {
  outputDir: getDefaultOutputDir(),
  format: "mp3",
  quality: "0",
  includeIdInFilename: false,
  cookiesFromBrowser: "none",
  playerClient: "android",
  retries: 10,
};
