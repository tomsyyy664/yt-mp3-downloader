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
export declare function showMainMenu(): Promise<"single" | "playlist" | "batch" | "spotify" | "config" | "exit">;
export declare function selectFormat(): Promise<"mp3" | "wav" | "flac" | "aac" | "opus">;
export declare function selectQuality(): Promise<"0" | "1" | "2" | "3" | "4" | "5">;
export declare function selectBrowser(): Promise<"chrome" | "firefox" | "edge" | "none">;
export declare function promptInput(question: string, defaultValue?: string): Promise<string>;
export declare function confirm(question: string): Promise<"yes" | "no">;
export declare function pressAnyKey(msg?: string): Promise<void>;
//# sourceMappingURL=ui.d.ts.map