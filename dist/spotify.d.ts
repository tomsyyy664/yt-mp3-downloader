export interface SpotifyTrack {
    title: string;
    artist: string;
    album: string;
    searchQuery: string;
}
export declare function extractSpotifyId(url: string): {
    type: "playlist" | "album" | "track";
    id: string;
} | null;
export declare function getSpotdlCmd(): Promise<string | null>;
export declare function installSpotdl(onStatus: (msg: string) => void): Promise<void>;
export declare function getSpotifyTracks(url: string, _creds: any, onStatus?: (msg: string) => void): Promise<SpotifyTrack[]>;
export declare function downloadWithSpotdl(url: string, outputDir: string, spotdlCmd: string, onLine: (line: string) => void): Promise<void>;
//# sourceMappingURL=spotify.d.ts.map