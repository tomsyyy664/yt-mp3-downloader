"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/index.ts -- Punto de entrada principal
const config_js_1 = require("./config.js");
const ui_js_1 = require("./ui.js");
const downloader_js_1 = require("./downloader.js");
const configScreen_js_1 = require("./configScreen.js");
const ytdlp_js_1 = require("./ytdlp.js");
// ─── Estado de la app ────────────────────────────────────────────────────────
let config = { ...config_js_1.DEFAULT_CONFIG };
// ─── Flujo: descarga individual ──────────────────────────────────────────────
async function flowSingleDownload() {
    (0, ui_js_1.printBanner)();
    (0, ui_js_1.printInfo)("Descarga individual\n");
    const url = await (0, ui_js_1.promptInput)("URL del vídeo de YouTube");
    if (!url) {
        (0, ui_js_1.printWarning)("No se introdujo ninguna URL.");
        await (0, ui_js_1.pressAnyKey)();
        return;
    }
    (0, ui_js_1.printDivider)();
    (0, downloader_js_1.ensureDir)(config.outputDir);
    (0, ui_js_1.printInfo)(`Carpeta de salida: ${config.outputDir}\n`);
    const result = await (0, downloader_js_1.downloadVideo)(url, config, (msg) => {
        (0, ui_js_1.printProgress)(msg);
    });
    (0, ui_js_1.printDivider)();
    printDownloadResult(result);
    await (0, ui_js_1.pressAnyKey)();
}
// ─── Flujo: playlist ─────────────────────────────────────────────────────────
async function flowPlaylistDownload() {
    (0, ui_js_1.printBanner)();
    (0, ui_js_1.printInfo)("Descarga de playlist\n");
    const url = await (0, ui_js_1.promptInput)("URL de la playlist de YouTube");
    if (!url) {
        (0, ui_js_1.printWarning)("No se introdujo ninguna URL.");
        await (0, ui_js_1.pressAnyKey)();
        return;
    }
    (0, ui_js_1.printDivider)();
    (0, ui_js_1.printProgress)("Expandiendo playlist...");
    let videoUrls;
    try {
        videoUrls = await (0, downloader_js_1.expandPlaylist)(url, config);
    }
    catch (err) {
        (0, ui_js_1.printError)(`No se pudo obtener la playlist: ${err instanceof Error ? err.message : String(err)}`);
        await (0, ui_js_1.pressAnyKey)();
        return;
    }
    (0, ui_js_1.printInfo)(`Encontrados ${videoUrls.length} vídeos.\n`);
    const proceed = await (0, ui_js_1.confirm)(`¿Descargar los ${videoUrls.length} vídeos?`);
    if (proceed !== "yes") {
        (0, ui_js_1.printWarning)("Operación cancelada.");
        await (0, ui_js_1.pressAnyKey)();
        return;
    }
    (0, downloader_js_1.ensureDir)(config.outputDir);
    (0, ui_js_1.printDivider)();
    const results = await (0, downloader_js_1.downloadBatch)(videoUrls, config, {
        onStart: (_url, i, total) => {
            (0, ui_js_1.printProgress)(`[${i + 1}/${total}] Procesando...`);
        },
        onResult: (result, i, total) => {
            printDownloadResult(result);
            (0, ui_js_1.printDivider)();
        },
        onProgress: (msg) => {
            (0, ui_js_1.printProgress)(msg);
        },
    });
    printSummary(results);
    await (0, ui_js_1.pressAnyKey)();
}
// ─── Flujo: batch desde .txt ─────────────────────────────────────────────────
async function flowBatchDownload() {
    (0, ui_js_1.printBanner)();
    (0, ui_js_1.printInfo)("Descarga desde archivo de URLs\n");
    const filePath = await (0, ui_js_1.promptInput)("Ruta del archivo .txt con URLs (una por línea)");
    if (!filePath) {
        (0, ui_js_1.printWarning)("No se introdujo ninguna ruta.");
        await (0, ui_js_1.pressAnyKey)();
        return;
    }
    let urls;
    try {
        urls = (0, downloader_js_1.readUrlsFromFile)(filePath);
    }
    catch (err) {
        (0, ui_js_1.printError)(err instanceof Error ? err.message : String(err));
        await (0, ui_js_1.pressAnyKey)();
        return;
    }
    if (urls.length === 0) {
        (0, ui_js_1.printWarning)("El archivo no contiene URLs válidas.");
        await (0, ui_js_1.pressAnyKey)();
        return;
    }
    (0, ui_js_1.printInfo)(`Encontradas ${urls.length} URLs.\n`);
    const proceed = await (0, ui_js_1.confirm)(`¿Descargar las ${urls.length} URLs?`);
    if (proceed !== "yes") {
        (0, ui_js_1.printWarning)("Operación cancelada.");
        await (0, ui_js_1.pressAnyKey)();
        return;
    }
    // Expandir playlists que puedan estar en el archivo
    (0, ui_js_1.printProgress)("Expandiendo playlists si las hay...");
    const expandedUrls = [];
    for (const url of urls) {
        try {
            const expanded = await (0, downloader_js_1.expandPlaylist)(url, config);
            expandedUrls.push(...expanded);
        }
        catch {
            expandedUrls.push(url); // si falla, usar la URL original
        }
    }
    if (expandedUrls.length !== urls.length) {
        (0, ui_js_1.printInfo)(`Total tras expansión: ${expandedUrls.length} vídeos.\n`);
    }
    (0, downloader_js_1.ensureDir)(config.outputDir);
    (0, ui_js_1.printDivider)();
    const results = await (0, downloader_js_1.downloadBatch)(expandedUrls, config, {
        onStart: (_url, i, total) => {
            (0, ui_js_1.printProgress)(`[${i + 1}/${total}] Procesando...`);
        },
        onResult: (result) => {
            printDownloadResult(result);
            (0, ui_js_1.printDivider)();
        },
        onProgress: (msg) => {
            (0, ui_js_1.printProgress)(msg);
        },
    });
    printSummary(results);
    await (0, ui_js_1.pressAnyKey)();
}
// ─── Helpers de resultado ────────────────────────────────────────────────────
function printDownloadResult(result) {
    switch (result.status) {
        case "success":
            (0, ui_js_1.printSuccess)(`Descargado: ${result.title}`);
            if (result.outputPath) {
                (0, ui_js_1.printInfo)(`Guardado en: ${result.outputPath}`);
            }
            break;
        case "skipped":
            (0, ui_js_1.printSkipped)(`Ya existe: ${result.title}`);
            break;
        case "error":
            (0, ui_js_1.printError)(`Error con: ${result.title}`);
            if (result.errorMessage) {
                (0, ui_js_1.printError)(`  ${result.errorMessage}`);
            }
            break;
    }
}
function printSummary(results) {
    const success = results.filter((r) => r.status === "success").length;
    const skipped = results.filter((r) => r.status === "skipped").length;
    const errors = results.filter((r) => r.status === "error").length;
    (0, ui_js_1.printDivider)();
    (0, ui_js_1.printInfo)(`Resumen final:`);
    (0, ui_js_1.printSuccess)(`  ${success} descargados correctamente`);
    if (skipped > 0)
        (0, ui_js_1.printSkipped)(`  ${skipped} ya existían (omitidos)`);
    if (errors > 0)
        (0, ui_js_1.printError)(`  ${errors} errores`);
}
// ─── Flujo: busqueda por nombre ──────────────────────────────────────────────
async function flowSpotifyDownload() {
    (0, ui_js_1.printBanner)();
    (0, ui_js_1.printInfo)("Busqueda por nombre de cancion");
    (0, ui_js_1.printInfo)("Escribe el nombre de la cancion y artista para buscarla en YouTube.");
    (0, ui_js_1.printInfo)("Ejemplo: Bad Bunny - 120");
    (0, ui_js_1.printDivider)();
    const query = await (0, ui_js_1.promptInput)("Nombre de la cancion (artista - titulo)");
    if (!query) {
        (0, ui_js_1.printWarning)("No se introdujo nada.");
        await (0, ui_js_1.pressAnyKey)();
        return;
    }
    (0, downloader_js_1.ensureDir)(config.outputDir);
    (0, ui_js_1.printDivider)();
    (0, ui_js_1.printProgress)("Buscando en YouTube: " + query);
    const result = await (0, downloader_js_1.downloadVideo)("ytsearch1:" + query + " audio", config, (msg) => (0, ui_js_1.printProgress)(msg));
    printDownloadResult(result);
    (0, ui_js_1.printInfo)("Carpeta: " + config.outputDir);
    await (0, ui_js_1.pressAnyKey)();
}
// ─── Loop principal ──────────────────────────────────────────────────────────
async function main() {
    const cliArgs = process.argv.slice(2);
    if (cliArgs.includes("--flush-hdir")) {
        (0, ytdlp_js_1.flushAppDir)();
        process.stdout.write("Directorio limpiado: " + ytdlp_js_1.APP_DIR + "\n");
        process.exit(0);
    }
    if (cliArgs.includes("--help") || cliArgs.includes("-h")) {
        process.stdout.write([
            "",
            "  yt-mp3-downloader",
            "",
            "  Uso: node dist/index.js [opciones]",
            "",
            "  Opciones:",
            "    --flush-hdir   Limpia ~/.yt-mp3-downloader (binarios descargados)",
            "    --help, -h     Muestra esta ayuda",
            "",
        ].join("\n") + "\n");
        process.exit(0);
    }
    (0, ui_js_1.printBanner)();
    (0, ui_js_1.printInfo)("Iniciando... comprobando yt-dlp\n");
    try {
        await (0, downloader_js_1.initYtDlp)((msg) => (0, ui_js_1.printInfo)(msg));
    }
    catch (err) {
        (0, ui_js_1.printError)(err instanceof Error ? err.message : String(err));
        await (0, ui_js_1.pressAnyKey)("Pulsa cualquier tecla para salir.");
        process.exit(1);
    }
    while (true) {
        (0, ui_js_1.printBanner)();
        (0, ui_js_1.printInfo)(`Carpeta de salida: ${config.outputDir}`);
        (0, ui_js_1.printInfo)(`Formato: ${config.format.toUpperCase()} | Calidad: ${config.quality} | Cookies: ${config.cookiesFromBrowser}\n`);
        const action = await (0, ui_js_1.showMainMenu)();
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
            case "spotify":
                await flowSpotifyDownload();
                break;
            case "config":
                config = await (0, configScreen_js_1.showConfigScreen)(config);
                break;
            case "exit":
                (0, ui_js_1.exitApp)();
                return;
        }
    }
}
main().catch((err) => {
    (0, ui_js_1.printError)(`Error fatal: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
});
//# sourceMappingURL=index.js.map