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
exports.DEFAULT_CONFIG = void 0;
exports.getDefaultOutputDir = getDefaultOutputDir;
// src/config.ts — Configuración por defecto y paths de salida
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
/**
 * Detecta la carpeta real de Documentos en Windows.
 * En Windows el sistema de ficheros usa "Documents" aunque el explorador
 * lo muestre como "Documentos" según el idioma del sistema.
 */
function getDefaultOutputDir() {
    const home = os.homedir();
    const candidates = process.platform === "win32"
        ? [
            path.join(home, "Documents", "songs"),
            path.join(home, "Documentos", "songs"),
            path.join(home, "Mis documentos", "songs"),
            path.join(home, "songs"),
        ]
        : [
            path.join(home, "Documents", "songs"),
            path.join(home, "Documentos", "songs"),
            path.join(home, "songs"),
        ];
    // Usar la primera cuyo directorio padre ya existe
    for (const candidate of candidates) {
        if (fs.existsSync(path.dirname(candidate))) {
            return candidate;
        }
    }
    return path.join(home, "songs");
}
exports.DEFAULT_CONFIG = {
    outputDir: getDefaultOutputDir(),
    format: "mp3",
    quality: "0",
    includeIdInFilename: false,
    cookiesFromBrowser: "none",
    playerClient: "android",
    retries: 10,
};
//# sourceMappingURL=config.js.map