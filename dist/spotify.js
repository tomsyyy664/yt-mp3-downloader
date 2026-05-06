"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractSpotifyId = extractSpotifyId;
exports.getSpotdlCmd = getSpotdlCmd;
exports.installSpotdl = installSpotdl;
exports.getSpotifyTracks = getSpotifyTracks;
exports.downloadWithSpotdl = downloadWithSpotdl;
// src/spotify.ts
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
function extractSpotifyId(url) {
    const match = url.match(/spotify\.com\/(?:intl-[a-z]+\/)?(playlist|album|track)\/([A-Za-z0-9]+)/);
    if (!match)
        return null;
    return { type: match[1], id: match[2] };
}
async function getSpotdlCmd() {
    const candidates = ["spotdl", "python -m spotdl", "python3 -m spotdl", "py -m spotdl"];
    for (const cmd of candidates) {
        try {
            await execAsync(`${cmd} --version`, { timeout: 8000 });
            return cmd;
        }
        catch { /* siguiente */ }
    }
    return null;
}
async function installSpotdl(onStatus) {
    onStatus("Instalando spotdl...");
    const cmds = [
        "pip install spotdl",
        "pip3 install spotdl",
        "python -m pip install spotdl",
        "py -m pip install spotdl",
    ];
    for (const cmd of cmds) {
        try {
            await execAsync(cmd, { timeout: 120000 });
            onStatus("spotdl instalado.");
            return;
        }
        catch { /* siguiente */ }
    }
    throw new Error("No se pudo instalar spotdl.\n" +
        "Instala Python desde https://python.org y ejecuta: pip install spotdl");
}
// Limpia la URL de Spotify quitando parametros y prefijos de idioma
function cleanSpotifyUrl(url) {
    return url
        .replace(/[?&]si=[^&]+/g, "")
        .replace(/[?&]$/, "")
        .replace(/\/intl-[a-z]+\//g, "/");
}
// Obtiene tracks usando "spotdl save --save-file -" que devuelve JSON sin descargar
async function fetchTracksWithSpotdl(url, cmd, onStatus) {
    onStatus("Leyendo canciones con spotdl...");
    const clean = cleanSpotifyUrl(url);
    const { stdout } = await execAsync(`${cmd} save "${clean}" --save-file -`, { maxBuffer: 20 * 1024 * 1024, timeout: 60000 });
    let data;
    try {
        data = JSON.parse(stdout.trim());
    }
    catch {
        throw new Error("spotdl no devolvio JSON valido.");
    }
    const songs = Array.isArray(data) ? data : (data.songs ?? []);
    if (songs.length === 0) {
        throw new Error("spotdl no encontro canciones en este enlace.");
    }
    return songs.map((s) => {
        const artist = s.artist ?? s.artists?.[0] ?? "Desconocido";
        const title = s.name ?? s.title ?? "Desconocido";
        return {
            title,
            artist,
            album: s.album_name ?? s.album ?? "",
            searchQuery: `${artist} - ${title}`,
        };
    });
}
async function getSpotifyTracks(url, _creds, onStatus) {
    const log = onStatus ?? (() => { });
    if (!extractSpotifyId(url)) {
        throw new Error("URL de Spotify no valida.");
    }
    // Obtener o instalar spotdl
    let cmd = await getSpotdlCmd();
    if (!cmd) {
        await installSpotdl(log);
        cmd = await getSpotdlCmd();
    }
    if (!cmd) {
        throw new Error("spotdl no disponible.\n" +
            "Instala Python desde https://python.org y ejecuta: pip install spotdl\n" +
            "Luego cierra y vuelve a abrir la terminal.");
    }
    // Obtener lista de canciones (sin descargar)
    const tracks = await fetchTracksWithSpotdl(url, cmd, log);
    log(`${tracks.length} canciones encontradas.`);
    return tracks;
}
// Descarga directamente con spotdl (alternativa al flujo yt-dlp)
function downloadWithSpotdl(url, outputDir, spotdlCmd, onLine) {
    return new Promise((resolve, reject) => {
        const clean = cleanSpotifyUrl(url);
        const bin = spotdlCmd.split(" ")[0];
        const baseArgs = spotdlCmd.includes(" ") ? spotdlCmd.split(" ").slice(1) : [];
        const args = [...baseArgs, "download", clean, "--output", outputDir, "--format", "mp3"];
        const child = (0, child_process_1.spawn)(bin, args, { stdio: ["ignore", "pipe", "pipe"] });
        child.stdout?.on("data", (d) => d.toString().split(/\r?\n/).filter(Boolean).forEach(onLine));
        child.stderr?.on("data", (d) => d.toString().split(/\r?\n/).filter(Boolean).forEach(onLine));
        child.on("close", (code) => code === 0 ? resolve() : reject(new Error(`spotdl termino con codigo ${code}`)));
        child.on("error", reject);
    });
}
//# sourceMappingURL=spotify.js.map