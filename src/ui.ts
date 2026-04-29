// src/ui.ts — Interfaz de terminal con terminal-kit
import * as termkit from "terminal-kit";
import type { AudioFormat, AudioQuality, ConfirmResult } from "./types.js";

const term = termkit.terminal;

// ─── Colores y helpers ───────────────────────────────────────────────────────

export function clearScreen(): void {
  term.clear();
}

export function printBanner(): void {
  term.clear();
  term.bold.cyan("\n  ╔══════════════════════════════════════╗\n");
  term.bold.cyan("  ║      ");
  term.bold.white("🎵 YouTube MP3 Downloader");
  term.bold.cyan("       ║\n");
  term.bold.cyan("  ╚══════════════════════════════════════╝\n\n");
}

export function printSuccess(msg: string): void {
  term.bold.green(`  ✅ ${msg}\n`);
}

export function printError(msg: string): void {
  term.bold.red(`  ❌ ${msg}\n`);
}

export function printWarning(msg: string): void {
  term.bold.yellow(`  ⚠️  ${msg}\n`);
}

export function printInfo(msg: string): void {
  term.bold.cyan(`  ℹ️  ${msg}\n`);
}

export function printProgress(msg: string): void {
  term(`  ⏬ ${msg}\n`);
}

export function printSkipped(msg: string): void {
  term.bold.yellow(`  ⏭️  ${msg}\n`);
}

export function printDivider(): void {
  term.gray("  ────────────────────────────────────────\n");
}

export function exitApp(): void {
  term.bold.cyan("\n  ¡Hasta la próxima! 🎧\n\n");
  term.processExit(0);
}

// ─── Menús interactivos ──────────────────────────────────────────────────────

/**
 * Menú principal de acción
 */
export async function showMainMenu(): Promise<
  "single" | "playlist" | "batch" | "config" | "exit"
> {
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
      const map: Record<
        number,
        "single" | "playlist" | "batch" | "config" | "exit"
      > = {
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
export async function selectFormat(): Promise<AudioFormat> {
  term.bold.white("\n  Formato de audio:\n\n");

  const formats: AudioFormat[] = ["mp3", "wav", "flac", "aac", "opus"];
  const labels = [
    "🎵  MP3  — Mejor compatibilidad",
    "🔊  WAV  — Sin pérdida (archivos grandes)",
    "🎛️   FLAC — Sin pérdida comprimido",
    "🎙️   AAC  — Buena calidad, tamaño reducido",
    "📻  OPUS — Máxima eficiencia",
  ];

  return new Promise((resolve) => {
    term.singleColumnMenu(
      labels,
      { leftPadding: "  " },
      (_err, response) => {
        resolve(formats[response.selectedIndex] ?? "mp3");
      }
    );
  });
}

/**
 * Menú de calidad de audio
 */
export async function selectQuality(): Promise<AudioQuality> {
  term.bold.white("\n  Calidad de audio (para MP3/AAC):\n\n");

  const qualities: AudioQuality[] = ["0", "1", "2", "3", "4", "5"];
  const labels = [
    "⭐⭐⭐  0 — Mejor calidad (más grande)",
    "⭐⭐⭐  1 — Muy alta",
    "⭐⭐⭐  2 — Alta (recomendada)",
    "⭐⭐   3 — Media-alta",
    "⭐⭐   4 — Media",
    "⭐    5 — Baja (más pequeño)",
  ];

  return new Promise((resolve) => {
    term.singleColumnMenu(
      labels,
      { leftPadding: "  " },
      (_err, response) => {
        resolve(qualities[response.selectedIndex] ?? "0");
      }
    );
  });
}

/**
 * Menú de selección de navegador para cookies
 */
export async function selectBrowser(): Promise<
  "chrome" | "firefox" | "edge" | "none"
> {
  term.bold.white("\n  ¿De qué navegador usar las cookies?\n");
  term.gray("  (Necesario para vídeos con restricciones de edad)\n\n");

  const options = ["chrome", "firefox", "edge", "none"] as const;
  const labels = [
    "🌐  Chrome / Chromium",
    "🦊  Firefox",
    "🔷  Edge",
    "🚫  Sin cookies",
  ];

  return new Promise((resolve) => {
    term.singleColumnMenu(
      labels,
      { leftPadding: "  " },
      (_err, response) => {
        resolve(options[response.selectedIndex] ?? "chrome");
      }
    );
  });
}

/**
 * Solicitar input de texto al usuario
 */
export async function promptInput(
  question: string,
  defaultValue?: string
): Promise<string> {
  term.bold.white(`\n  ${question}`);
  if (defaultValue) {
    term.gray(` (Enter para usar: ${defaultValue})`);
  }
  term(": ");

  return new Promise((resolve) => {
    term.inputField(
      { default: defaultValue ?? "" },
      (_err, input) => {
        term("\n");
        resolve((input ?? defaultValue ?? "").trim());
      }
    );
  });
}

/**
 * Confirmar acción (sí/no)
 */
export async function confirm(question: string): Promise<ConfirmResult> {
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
export function createProgressBar(total: number): termkit.Terminal.ProgressBarController {
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
export async function pressAnyKey(msg = "Pulsa cualquier tecla para continuar..."): Promise<void> {
  term.bold.gray(`\n  ${msg}`);
  await term.inputField({}).promise;
  term("\n");
}
