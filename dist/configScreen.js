"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.showConfigScreen = showConfigScreen;
const ui_js_1 = require("./ui.js");
async function showConfigScreen(current) {
    (0, ui_js_1.printBanner)();
    (0, ui_js_1.printInfo)("Configuración actual:\n");
    (0, ui_js_1.printDivider)();
    console.log(`  📁  Carpeta de salida:  ${current.outputDir}`);
    console.log(`  🎵  Formato:            ${current.format.toUpperCase()}`);
    console.log(`  🎚️   Calidad:            ${current.quality} (0 = máxima)`);
    console.log(`  🌐  Cookies desde:      ${current.cookiesFromBrowser}`);
    console.log(`  🔖  ID en nombre:       ${current.includeIdInFilename ? "sí" : "no"}\n`);
    (0, ui_js_1.printDivider)();
    const config = { ...current };
    // Carpeta de salida
    const newDir = await (0, ui_js_1.promptInput)("Carpeta de salida", current.outputDir);
    config.outputDir = newDir || current.outputDir;
    // Formato
    config.format = await (0, ui_js_1.selectFormat)();
    // Calidad (solo relevante para formatos con pérdida)
    if (["mp3", "aac", "opus"].includes(config.format)) {
        config.quality = await (0, ui_js_1.selectQuality)();
    }
    // Navegador para cookies
    config.cookiesFromBrowser = await (0, ui_js_1.selectBrowser)();
    // Incluir ID en nombre de archivo
    const includeId = await (0, ui_js_1.confirm)("¿Incluir el ID de YouTube en el nombre del archivo?");
    config.includeIdInFilename = includeId === "yes";
    return config;
}
//# sourceMappingURL=configScreen.js.map