"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.createProgressBar = createProgressBar;
exports.pressAnyKey = pressAnyKey;
// src/ui.ts — Interfaz de terminal con terminal-kit
const termkit = __importStar(require("terminal-kit"));
const term = termkit.terminal;
// ─── Colores y helpers ───────────────────────────────────────────────────────
function clearScreen() {
    term.clear();
}
function printBanner() {
    term.clear();
    term.bold.cyan("\n  ╔══════════════════════════════════════╗\n");
    term.bold.cyan("  ║      ");
    term.bold.white("🎵 YouTube MP3 Downloader");
    term.bold.cyan("       ║\n");
    term.bold.cyan("  ╚══════════════════════════════════════╝\n\n");
}
function printSuccess(msg) {
    term.bold.green(`  ✅ ${msg}\n`);
}
function printError(msg) {
    term.bold.red(`  ❌ ${msg}\n`);
}
function printWarning(msg) {
    term.bold.yellow(`  ⚠️  ${msg}\n`);
}
function printInfo(msg) {
    term.bold.cyan(`  ℹ️  ${msg}\n`);
}
function printProgress(msg) {
    term(`  ⏬ ${msg}\n`);
}
function printSkipped(msg) {
    term.bold.yellow(`  ⏭️  ${msg}\n`);
}
function printDivider() {
    term.gray("  ────────────────────────────────────────\n");
}
function exitApp() {
    term.bold.cyan("\n  ¡Hasta la próxima! 🎧\n\n");
    term.processExit(0);
}
// ─── Menús interactivos ──────────────────────────────────────────────────────
/**
 * Menú principal de acción
 */
async function showMainMenu() {
    term.bold.white("\n  ¿Qué quieres hacer?\n\n");
    const items = [
        "🎵  Descargar un vídeo individual",
        "📜  Descargar una playlist completa",
        "📂  Descargar desde lista de URLs (archivo .txt)",
        "⚙️   Configuración",
        "🚪  Salir",
    ];
    return new Promise((resolve) => {
        term.singleColumnMenu(items, { leftPadding: "  " }, (_err, response) => {
            const map = {
                0: "single",
                1: "playlist",
                2: "batch",
                3: "config",
                4: "exit",
            };
            resolve(map[response.selectedIndex] ?? "exit");
        });
    });
}
/**
 * Menú de selección de formato
 */
async function selectFormat() {
    term.bold.white("\n  Formato de audio:\n\n");
    const formats = ["mp3", "wav", "flac", "aac", "opus"];
    const labels = [
        "🎵  MP3  — Mejor compatibilidad",
        "🔊  WAV  — Sin pérdida (archivos grandes)",
        "🎛️   FLAC — Sin pérdida comprimido",
        "🎙️   AAC  — Buena calidad, tamaño reducido",
        "📻  OPUS — Máxima eficiencia",
    ];
    return new Promise((resolve) => {
        term.singleColumnMenu(labels, { leftPadding: "  " }, (_err, response) => {
            resolve(formats[response.selectedIndex] ?? "mp3");
        });
    });
}
/**
 * Menú de calidad de audio
 */
async function selectQuality() {
    term.bold.white("\n  Calidad de audio (para MP3/AAC):\n\n");
    const qualities = ["0", "1", "2", "3", "4", "5"];
    const labels = [
        "⭐⭐⭐  0 — Mejor calidad (más grande)",
        "⭐⭐⭐  1 — Muy alta",
        "⭐⭐⭐  2 — Alta (recomendada)",
        "⭐⭐   3 — Media-alta",
        "⭐⭐   4 — Media",
        "⭐    5 — Baja (más pequeño)",
    ];
    return new Promise((resolve) => {
        term.singleColumnMenu(labels, { leftPadding: "  " }, (_err, response) => {
            resolve(qualities[response.selectedIndex] ?? "0");
        });
    });
}
/**
 * Menú de selección de navegador para cookies
 */
async function selectBrowser() {
    term.bold.white("\n  ¿De qué navegador usar las cookies?\n");
    term.gray("  (Necesario para vídeos con restricciones de edad)\n\n");
    const options = ["chrome", "firefox", "edge", "none"];
    const labels = [
        "🌐  Chrome / Chromium",
        "🦊  Firefox",
        "🔷  Edge",
        "🚫  Sin cookies",
    ];
    return new Promise((resolve) => {
        term.singleColumnMenu(labels, { leftPadding: "  " }, (_err, response) => {
            resolve(options[response.selectedIndex] ?? "chrome");
        });
    });
}
/**
 * Solicitar input de texto al usuario
 */
async function promptInput(question, defaultValue) {
    term.bold.white(`\n  ${question}`);
    if (defaultValue) {
        term.gray(` (Enter para usar: ${defaultValue})`);
    }
    term(": ");
    return new Promise((resolve) => {
        term.inputField({ default: defaultValue ?? "" }, (_err, input) => {
            term("\n");
            resolve((input ?? defaultValue ?? "").trim());
        });
    });
}
/**
 * Confirmar acción (sí/no)
 */
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
/**
 * Mostrar barra de progreso
 */
function createProgressBar(total) {
    term("\n");
    const progressBar = term.progressBar({
        width: 40,
        title: "  Descargando:",
        eta: true,
        percent: true,
        items: total,
    });
    return progressBar;
}
/**
 * Esperar tecla para continuar
 */
async function pressAnyKey(msg = "Pulsa cualquier tecla para continuar...") {
    term.bold.gray(`\n  ${msg}`);
    await term.inputField({}).promise;
    term("\n");
}
//# sourceMappingURL=ui.js.map