import * as termkit from "terminal-kit";
import type { AudioFormat, AudioQuality, ConfirmResult } from "./types.js";
export declare function clearScreen(): void;
export declare function printBanner(): void;
export declare function printSuccess(msg: string): void;
export declare function printError(msg: string): void;
export declare function printWarning(msg: string): void;
export declare function printInfo(msg: string): void;
export declare function printProgress(msg: string): void;
export declare function printSkipped(msg: string): void;
export declare function printDivider(): void;
export declare function exitApp(): void;
/**
 * Menú principal de acción
 */
export declare function showMainMenu(): Promise<"single" | "playlist" | "batch" | "config" | "exit">;
/**
 * Menú de selección de formato
 */
export declare function selectFormat(): Promise<AudioFormat>;
/**
 * Menú de calidad de audio
 */
export declare function selectQuality(): Promise<AudioQuality>;
/**
 * Menú de selección de navegador para cookies
 */
export declare function selectBrowser(): Promise<"chrome" | "firefox" | "edge" | "none">;
/**
 * Solicitar input de texto al usuario
 */
export declare function promptInput(question: string, defaultValue?: string): Promise<string>;
/**
 * Confirmar acción (sí/no)
 */
export declare function confirm(question: string): Promise<ConfirmResult>;
/**
 * Mostrar barra de progreso
 */
export declare function createProgressBar(total: number): termkit.Terminal.ProgressBarController;
/**
 * Esperar tecla para continuar
 */
export declare function pressAnyKey(msg?: string): Promise<void>;
//# sourceMappingURL=ui.d.ts.map