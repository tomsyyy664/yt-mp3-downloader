"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearScreen = clearScreen;
exports.printBanner = printBanner;
exports.printSuccess = printSuccess;
exports.printError = printError;
exports.printWarning = printWarning;
exports.printInfo = printInfo;
exports.printProgress = printProgress;
exports.printSkipped = printSkipped;
exports.printDivider = printDivider;
exports.exitApp = exitApp;
exports.showMainMenu = showMainMenu;
exports.selectFormat = selectFormat;
exports.selectQuality = selectQuality;
exports.selectBrowser = selectBrowser;
exports.promptInput = promptInput;
exports.confirm = confirm;
exports.pressAnyKey = pressAnyKey;
// src/ui.ts -- Interfaz de terminal con terminal-kit
// eslint-disable-next-line @typescript-eslint/no-require-imports
const termkit = require("terminal-kit");
const term = termkit.terminal;
// ─── Colores y helpers ───────────────────────────────────────────────────────
function clearScreen() { term.clear(); }
function printBanner() {
    term.clear();
    term.bold.cyan("\n  ╔══════════════════════════════════════╗\n");
    term.bold.cyan("  ║      ");
    term.bold.white("YouTube MP3 Downloader");
    term.bold.cyan("         ║\n");
    term.bold.cyan("  ╚══════════════════════════════════════╝\n\n");
}
function printSuccess(msg) { term.bold.green(`  OK  ${msg}\n`); }
function printError(msg) { term.bold.red(`  ERR ${msg}\n`); }
function printWarning(msg) { term.bold.yellow(`  WRN ${msg}\n`); }
function printInfo(msg) { term.bold.cyan(`  INF ${msg}\n`); }
function printProgress(msg) { term(`  >>  ${msg}\n`); }
function printSkipped(msg) { term.bold.yellow(`  SKP ${msg}\n`); }
function printDivider() { term.gray("  ────────────────────────────────────────\n"); }
function exitApp() {
    term.bold.cyan("\n  Hasta la proxima!\n\n");
    term.processExit(0);
}
// ─── Menús interactivos ──────────────────────────────────────────────────────
async function showMainMenu() {
    term.bold.white("\n  Que quieres hacer?\n\n");
    const items = [
        "  Descargar un video de YouTube",
        "  Descargar una playlist de YouTube",
        "  Descargar desde lista de URLs (.txt)",
        "  Buscar cancion por nombre (rapido)",
        "  Configuracion",
        "  Salir",
    ];
    return new Promise((resolve) => {
        term.singleColumnMenu(items, { leftPadding: "  " }, (_err, response) => {
            const map = {
                0: "single", 1: "playlist", 2: "batch", 3: "spotify", 4: "config", 5: "exit",
            };
            resolve(map[response.selectedIndex] ?? "exit");
        });
    });
}
async function selectFormat() {
    term.bold.white("\n  Formato de audio:\n\n");
    const formats = ["mp3", "wav", "flac", "aac", "opus"];
    const labels = [
        "  MP3  - Mejor compatibilidad",
        "  WAV  - Sin perdida (archivos grandes)",
        "  FLAC - Sin perdida comprimido",
        "  AAC  - Buena calidad, tamano reducido",
        "  OPUS - Maxima eficiencia",
    ];
    return new Promise((resolve) => {
        term.singleColumnMenu(labels, { leftPadding: "  " }, (_err, response) => {
            resolve(formats[response.selectedIndex] ?? "mp3");
        });
    });
}
async function selectQuality() {
    term.bold.white("\n  Calidad de audio:\n\n");
    const qualities = ["0", "1", "2", "3", "4", "5"];
    const labels = [
        "  0 - Mejor calidad (mas grande)",
        "  1 - Muy alta",
        "  2 - Alta (recomendada)",
        "  3 - Media-alta",
        "  4 - Media",
        "  5 - Baja (mas pequeno)",
    ];
    return new Promise((resolve) => {
        term.singleColumnMenu(labels, { leftPadding: "  " }, (_err, response) => {
            resolve(qualities[response.selectedIndex] ?? "0");
        });
    });
}
async function selectBrowser() {
    term.bold.white("\n  Cookies del navegador:\n\n");
    const options = ["chrome", "firefox", "edge", "none"];
    const labels = [
        "  Chrome / Chromium",
        "  Firefox",
        "  Edge",
        "  Sin cookies (recomendado)",
    ];
    return new Promise((resolve) => {
        term.singleColumnMenu(labels, { leftPadding: "  " }, (_err, response) => {
            resolve(options[response.selectedIndex] ?? "none");
        });
    });
}
async function promptInput(question, defaultValue) {
    term.bold.white(`\n  ${question}`);
    if (defaultValue)
        term.gray(` (Enter para: ${defaultValue})`);
    term(": ");
    return new Promise((resolve) => {
        term.inputField({ default: defaultValue ?? "" }, (_err, input) => {
            term("\n");
            resolve((input ?? defaultValue ?? "").trim());
        });
    });
}
async function confirm(question) {
    term.bold.white(`\n  ${question} `);
    term.gray("[s/n]: ");
    return new Promise((resolve) => {
        term.yesOrNo({ yes: ["s", "S", "y", "Y"], no: ["n", "N"] }, (_err, result) => {
            term("\n");
            resolve(result ? "yes" : "no");
        });
    });
}
async function pressAnyKey(msg = "Pulsa cualquier tecla para continuar...") {
    term.bold.gray(`\n  ${msg}`);
    await term.inputField({}).promise;
    term("\n");
}
//# sourceMappingURL=ui.js.map