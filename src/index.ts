// src/index.ts — Punto de entrada principal
import { DEFAULT_CONFIG } from "./config.js";
import {
  printBanner,
  printSuccess,
  printError,
  printWarning,
  printInfo,
  printProgress,
  printSkipped,
  printDivider,
  showMainMenu,
  promptInput,
  confirm,
  pressAnyKey,
  exitApp,
} from "./ui.js";
import {
  downloadVideo,
  downloadBatch,
  expandPlaylist,
  readUrlsFromFile,
  ensureDir,
  initYtDlp,
} from "./downloader.js";
import { showConfigScreen } from "./configScreen.js";
import type { DownloadConfig, DownloadResult } from "./types.js";

// ─── Estado de la app ────────────────────────────────────────────────────────

let config: DownloadConfig = { ...DEFAULT_CONFIG };

// ─── Flujo: descarga individual ──────────────────────────────────────────────

async function flowSingleDownload(): Promise<void> {
  printBanner();
  printInfo("Descarga individual\n");

  const url = await promptInput("URL del vídeo de YouTube");
  if (!url) {
    printWarning("No se introdujo ninguna URL.");
    await pressAnyKey();
    return;
  }

  printDivider();
  ensureDir(config.outputDir);
  printInfo(`Carpeta de salida: ${config.outputDir}\n`);

  const result = await downloadVideo(url, config, (msg) => {
    printProgress(msg);
  });

  printDivider();
  printDownloadResult(result);
  await pressAnyKey();
}

// ─── Flujo: playlist ─────────────────────────────────────────────────────────

async function flowPlaylistDownload(): Promise<void> {
  printBanner();
  printInfo("Descarga de playlist\n");

  const url = await promptInput("URL de la playlist de YouTube");
  if (!url) {
    printWarning("No se introdujo ninguna URL.");
    await pressAnyKey();
    return;
  }

  printDivider();
  printProgress("Expandiendo playlist…");

  let videoUrls: string[];
  try {
    videoUrls = await expandPlaylist(url, config);
  } catch (err) {
    printError(`No se pudo obtener la playlist: ${err instanceof Error ? err.message : String(err)}`);
    await pressAnyKey();
    return;
  }

  printInfo(`Encontrados ${videoUrls.length} vídeos.\n`);

  const proceed = await confirm(`¿Descargar los ${videoUrls.length} vídeos?`);
  if (proceed !== "yes") {
    printWarning("Operación cancelada.");
    await pressAnyKey();
    return;
  }

  ensureDir(config.outputDir);
  printDivider();

  const results = await downloadBatch(videoUrls, config, {
    onStart: (_url: string, i: number, total: number) => {
      printProgress(`[${i + 1}/${total}] Procesando…`);
    },
    onResult: (result: import("./types.js").DownloadResult, i: number, total: number) => {
      printDownloadResult(result);
      printDivider();
    },
    onProgress: (msg: string) => {
      printProgress(msg);
    },
  });

  printSummary(results);
  await pressAnyKey();
}

// ─── Flujo: batch desde .txt ─────────────────────────────────────────────────

async function flowBatchDownload(): Promise<void> {
  printBanner();
  printInfo("Descarga desde archivo de URLs\n");

  const filePath = await promptInput(
    "Ruta del archivo .txt con URLs (una por línea)"
  );
  if (!filePath) {
    printWarning("No se introdujo ninguna ruta.");
    await pressAnyKey();
    return;
  }

  let urls: string[];
  try {
    urls = readUrlsFromFile(filePath);
  } catch (err) {
    printError(err instanceof Error ? err.message : String(err));
    await pressAnyKey();
    return;
  }

  if (urls.length === 0) {
    printWarning("El archivo no contiene URLs válidas.");
    await pressAnyKey();
    return;
  }

  printInfo(`Encontradas ${urls.length} URLs.\n`);

  const proceed = await confirm(`¿Descargar las ${urls.length} URLs?`);
  if (proceed !== "yes") {
    printWarning("Operación cancelada.");
    await pressAnyKey();
    return;
  }

  // Expandir playlists que puedan estar en el archivo
  printProgress("Expandiendo playlists si las hay…");
  const expandedUrls: string[] = [];
  for (const url of urls) {
    try {
      const expanded = await expandPlaylist(url, config);
      expandedUrls.push(...expanded);
    } catch {
      expandedUrls.push(url); // si falla, usar la URL original
    }
  }

  if (expandedUrls.length !== urls.length) {
    printInfo(`Total tras expansión: ${expandedUrls.length} vídeos.\n`);
  }

  ensureDir(config.outputDir);
  printDivider();

  const results = await downloadBatch(expandedUrls, config, {
    onStart: (_url: string, i: number, total: number) => {
      printProgress(`[${i + 1}/${total}] Procesando…`);
    },
    onResult: (result: import("./types.js").DownloadResult) => {
      printDownloadResult(result);
      printDivider();
    },
    onProgress: (msg: string) => {
      printProgress(msg);
    },
  });

  printSummary(results);
  await pressAnyKey();
}

// ─── Helpers de resultado ────────────────────────────────────────────────────

function printDownloadResult(result: DownloadResult): void {
  switch (result.status) {
    case "success":
      printSuccess(`Descargado: ${result.title}`);
      if (result.outputPath) {
        printInfo(`Guardado en: ${result.outputPath}`);
      }
      break;
    case "skipped":
      printSkipped(`Ya existe: ${result.title}`);
      break;
    case "error":
      printError(`Error con: ${result.title}`);
      if (result.errorMessage) {
        printError(`  ${result.errorMessage}`);
      }
      break;
  }
}

function printSummary(results: DownloadResult[]): void {
  const success = results.filter((r) => r.status === "success").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const errors = results.filter((r) => r.status === "error").length;

  printDivider();
  printInfo(`Resumen final:`);
  printSuccess(`  ${success} descargados correctamente`);
  if (skipped > 0) printSkipped(`  ${skipped} ya existían (omitidos)`);
  if (errors > 0) printError(`  ${errors} errores`);
}

// ─── Loop principal ──────────────────────────────────────────────────────────

async function main(): Promise<void> {
  printBanner();
  printInfo("Iniciando... comprobando yt-dlp\n");

  try {
    await initYtDlp((msg) => printInfo(msg));
  } catch (err) {
    printError(err instanceof Error ? err.message : String(err));
    await pressAnyKey("Pulsa cualquier tecla para salir.");
    process.exit(1);
  }

  while (true) {
    printBanner();
    printInfo(`Carpeta de salida: ${config.outputDir}`);
    printInfo(`Formato: ${config.format.toUpperCase()} | Calidad: ${config.quality} | Cookies: ${config.cookiesFromBrowser}\n`);

    const action = await showMainMenu();

    switch (action) {
      case "single":
        await flowSingleDownload();
        break;

      case "playlist":
        await flowPlaylistDownload();
        break;

      case "batch":
        await flowBatchDownload();
        break;

      case "config":
        config = await showConfigScreen(config);
        break;

      case "exit":
        exitApp();
        return;
    }
  }
}

main().catch((err) => {
  printError(`Error fatal: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
