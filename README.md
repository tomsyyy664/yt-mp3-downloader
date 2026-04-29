# 🎵 YouTube MP3 Downloader

Descargador de audio desde YouTube con interfaz interactiva en terminal. Escrito en **TypeScript**, usa `terminal-kit` para los menús y `yt-dlp` para las descargas.

## ✨ Características

- 🎛️ **Interfaz interactiva** con menús de selección en terminal (terminal-kit)
- 🎵 **Múltiples formatos**: MP3, WAV, FLAC, AAC, OPUS
- 📜 **Playlists completas** de YouTube
- 📂 **Batch download** desde un archivo `.txt` con URLs
- 🔁 **Reintentos automáticos** con múltiples fallbacks
- 🍪 **Soporte de cookies** desde Chrome, Firefox o Edge
- 📁 **Salida en** `~/Documentos/songs` (Windows) por defecto
- ✅ **Detección de duplicados** — no descarga lo que ya existe
- 🔒 **TypeScript estricto** con tipado robusto

## 📋 Requisitos

- **Node.js** >= 18.0.0
- **pnpm** >= 8.0.0
- **Windows** (también funciona en macOS/Linux)

## 🚀 Instalación

```bash
# Clonar el repositorio
git clone https://github.com/tomsyyy664/yt-mp3-downloader.git
cd yt-mp3-downloader

# Instalar dependencias con pnpm
pnpm install

# Compilar TypeScript
pnpm build
```

## ▶️ Uso

```bash
# Ejecutar
pnpm start

# O en modo desarrollo (sin compilar)
pnpm dev
```

Al arrancar verás el menú principal:

```
  ╔══════════════════════════════════════╗
  ║      🎵 YouTube MP3 Downloader       ║
  ╚══════════════════════════════════════╝

  ¿Qué quieres hacer?

  🎵  Descargar un vídeo individual
  📜  Descargar una playlist completa
  📂  Descargar desde lista de URLs (archivo .txt)
  ⚙️   Configuración
  🚪  Salir
```

### Archivo de URLs (.txt)

Crea un archivo con una URL por línea. Las líneas que empiecen por `#` se ignoran:

```
# Mis canciones favoritas
https://www.youtube.com/watch?v=xxxxx
https://www.youtube.com/watch?v=yyyyy
https://www.youtube.com/playlist?list=zzzzz
```

## ⚙️ Configuración

Desde el menú **Configuración** puedes cambiar:

| Opción | Por defecto |
|--------|-------------|
| Carpeta de salida | `~/Documentos/songs` |
| Formato | MP3 |
| Calidad | 0 (máxima) |
| Cookies desde | Chrome |
| ID en nombre de archivo | No |

## 🛠️ Stack técnico

| Herramienta | Uso |
|-------------|-----|
| TypeScript 5 | Lenguaje principal |
| terminal-kit | Menús interactivos en terminal |
| yt-dlp-exec | Wrapper de yt-dlp para Node.js |
| ffmpeg-static | FFmpeg empaquetado (conversión de audio) |
| pnpm | Gestor de paquetes |

## 📦 Scripts
Compruebe package.json

```bash
pnpm build   # Compila TypeScript → dist/
pnpm start   # Ejecuta la versión compilada
pnpm dev     # Ejecuta con ts-node (desarrollo)
pnpm clean   # Limpia la carpeta dist/
```
