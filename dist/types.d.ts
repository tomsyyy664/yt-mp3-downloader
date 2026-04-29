export type AudioFormat = "mp3" | "wav" | "flac" | "aac" | "opus";
export type AudioQuality = "0" | "1" | "2" | "3" | "4" | "5";
export type PlayerClient = "android" | "web" | "ios" | "tv_embedded";
export interface DownloadConfig {
    outputDir: string;
    format: AudioFormat;
    quality: AudioQuality;
    includeIdInFilename: boolean;
    cookiesFromBrowser: "chrome" | "firefox" | "edge" | "none";
    playerClient: PlayerClient;
    retries: number;
}
export interface VideoInfo {
    id: string;
    title: string;
    uploader?: string;
    duration?: number;
    webpage_url?: string;
    thumbnail?: string;
    playlist?: string | null;
    playlist_index?: number | null;
}
export interface DownloadResult {
    url: string;
    title: string;
    status: "success" | "skipped" | "error";
    outputPath?: string;
    errorMessage?: string;
}
export interface YtDlpFlags {
    format?: string;
    retries?: number;
    "fragment-retries"?: number;
    "http-chunk-size"?: number;
    "geo-bypass"?: boolean;
    "cookies-from-browser"?: string;
    "extractor-args"?: string;
    "flat-playlist"?: boolean;
    print?: string;
    "dump-single-json"?: boolean;
    "no-warnings"?: boolean;
    "extract-audio"?: boolean;
    "audio-format"?: string;
    "audio-quality"?: string | number;
    "ffmpeg-location"?: string;
    output?: string;
    "rm-cache-dir"?: boolean;
}
export interface MenuOption {
    label: string;
    value: string;
}
export type ConfirmResult = "yes" | "no";
//# sourceMappingURL=types.d.ts.map