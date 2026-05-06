// src/ui.ts -- Interfaz de terminal con terminal-kit
// eslint-disable-next-line @typescript-eslint/no-require-imports
const termkit = require("terminal-kit");
const term: any = termkit.terminal;

// ─── Colores y helpers ───────────────────────────────────────────────────────

export function clearScreen(): void { term.clear(); }

export function printBanner(): void {
  term.clear();
  term.bold.cyan("\n  ╔══════════════════════════════════════╗\n");
  term.bold.cyan("  ║      ");
  term.bold.white("YouTube MP3 Downloader");
  term.bold.cyan("         ║\n");
  term.bold.cyan("  ╚══════════════════════════════════════╝\n\n");
}

export function printSuccess(msg: string): void { term.bold.green(`  OK  ${msg}\n`); }
export function printError(msg: string): void   { term.bold.red(`  ERR ${msg}\n`); }
export function printWarning(msg: string): void { term.bold.yellow(`  WRN ${msg}\n`); }
export function printInfo(msg: string): void    { term.bold.cyan(`  INF ${msg}\n`); }
export function printProgress(msg: string): void { term(`  >>  ${msg}\n`); }
export function printSkipped(msg: string): void { term.bold.yellow(`  SKP ${msg}\n`); }
export function printDivider(): void { term.gray("  ────────────────────────────────────────\n"); }

export function exitApp(): void {
  term.bold.cyan("\n  Hasta la proxima!\n\n");
  term.processExit(0);
}

// ─── Menús interactivos ──────────────────────────────────────────────────────

export async function showMainMenu(): Promise<"single" | "playlist" | "batch" | "spotify" | "config" | "exit"> {
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
    term.singleColumnMenu(items, { leftPadding: "  " }, (_err: any, response: any) => {
      const map: Record<number, "single" | "playlist" | "batch" | "spotify" | "config" | "exit"> = {
        0: "single", 1: "playlist", 2: "batch", 3: "spotify", 4: "config", 5: "exit",
      };
      resolve(map[response.selectedIndex] ?? "exit");
    });
  });
}

export async function selectFormat(): Promise<"mp3" | "wav" | "flac" | "aac" | "opus"> {
  term.bold.white("\n  Formato de audio:\n\n");
  const formats = ["mp3", "wav", "flac", "aac", "opus"] as const;
  const labels = [
    "  MP3  - Mejor compatibilidad",
    "  WAV  - Sin perdida (archivos grandes)",
    "  FLAC - Sin perdida comprimido",
    "  AAC  - Buena calidad, tamano reducido",
    "  OPUS - Maxima eficiencia",
  ];
  return new Promise((resolve) => {
    term.singleColumnMenu(labels, { leftPadding: "  " }, (_err: any, response: any) => {
      resolve(formats[response.selectedIndex] ?? "mp3");
    });
  });
}

export async function selectQuality(): Promise<"0" | "1" | "2" | "3" | "4" | "5"> {
  term.bold.white("\n  Calidad de audio:\n\n");
  const qualities = ["0", "1", "2", "3", "4", "5"] as const;
  const labels = [
    "  0 - Mejor calidad (mas grande)",
    "  1 - Muy alta",
    "  2 - Alta (recomendada)",
    "  3 - Media-alta",
    "  4 - Media",
    "  5 - Baja (mas pequeno)",
  ];
  return new Promise((resolve) => {
    term.singleColumnMenu(labels, { leftPadding: "  " }, (_err: any, response: any) => {
      resolve(qualities[response.selectedIndex] ?? "0");
    });
  });
}

export async function selectBrowser(): Promise<"chrome" | "firefox" | "edge" | "none"> {
  term.bold.white("\n  Cookies del navegador:\n\n");
  const options = ["chrome", "firefox", "edge", "none"] as const;
  const labels = [
    "  Chrome / Chromium",
    "  Firefox",
    "  Edge",
    "  Sin cookies (recomendado)",
  ];
  return new Promise((resolve) => {
    term.singleColumnMenu(labels, { leftPadding: "  " }, (_err: any, response: any) => {
      resolve(options[response.selectedIndex] ?? "none");
    });
  });
}

export async function promptInput(question: string, defaultValue?: string): Promise<string> {
  term.bold.white(`\n  ${question}`);
  if (defaultValue) term.gray(` (Enter para: ${defaultValue})`);
  term(": ");
  return new Promise((resolve) => {
    term.inputField({ default: defaultValue ?? "" }, (_err: any, input: any) => {
      term("\n");
      resolve(((input as string | undefined) ?? defaultValue ?? "").trim());
    });
  });
}

export async function confirm(question: string): Promise<"yes" | "no"> {
  term.bold.white(`\n  ${question} `);
  term.gray("[s/n]: ");
  return new Promise((resolve) => {
    term.yesOrNo({ yes: ["s", "S", "y", "Y"], no: ["n", "N"] }, (_err: any, result: any) => {
      term("\n");
      resolve(result ? "yes" : "no");
    });
  });
}

export async function pressAnyKey(msg = "Pulsa cualquier tecla para continuar..."): Promise<void> {
  term.bold.gray(`\n  ${msg}`);
  await term.inputField({}).promise;
  term("\n");
}
