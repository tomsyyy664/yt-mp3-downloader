import type { DownloadConfig } from "./types.js";
/**
 * Detecta la carpeta real de Documentos en Windows.
 * En Windows el sistema de ficheros usa "Documents" aunque el explorador
 * lo muestre como "Documentos" según el idioma del sistema.
 */
export declare function getDefaultOutputDir(): string;
export declare const DEFAULT_CONFIG: DownloadConfig;
//# sourceMappingURL=config.d.ts.map