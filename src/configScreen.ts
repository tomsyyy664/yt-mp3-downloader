// src/configScreen.ts -- Pantalla de configuración interactiva
import * as path from "path";
import type { DownloadConfig } from "./types.js";
import {
  printBanner,
  printDivider,
  printInfo,
  selectFormat,
  selectQuality,
  selectBrowser,
  promptInput,
  confirm,
} from "./ui.js";

export async function showConfigScreen(
  current: DownloadConfig
): Promise<DownloadConfig> {
  printBanner();
  printInfo("Configuración actual:\n");
  printDivider();

  console.log(`  📁  Carpeta de salida:  ${current.outputDir}`);
  console.log(`  🎵  Formato:            ${current.format.toUpperCase()}`);
  console.log(`  🎚️   Calidad:            ${current.quality} (0 = máxima)`);
  console.log(`  🌐  Cookies desde:      ${current.cookiesFromBrowser}`);
  console.log(
    `  🔖  ID en nombre:       ${current.includeIdInFilename ? "sí" : "no"}\n`
  );
  printDivider();

  const config: DownloadConfig = { ...current };

  // Carpeta de salida
  const newDir = await promptInput(
    "Carpeta de salida",
    current.outputDir
  );
  config.outputDir = newDir || current.outputDir;

  // Formato
  config.format = await selectFormat();

  // Calidad (solo relevante para formatos con pérdida)
  if (["mp3", "aac", "opus"].includes(config.format)) {
    config.quality = await selectQuality();
  }

  // Navegador para cookies
  config.cookiesFromBrowser = await selectBrowser();

  // Incluir ID en nombre de archivo
  const includeId = await confirm("¿Incluir el ID de YouTube en el nombre del archivo?");
  config.includeIdInFilename = includeId === "yes";

  return config;
}
