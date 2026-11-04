# Compilar LosPapus Launcher

## Requisitos

- Windows 10/11 x64.
- Node.js 22.12+ y npm.
- Acceso a Internet para instalar dependencias npm.

## Desarrollo

```powershell
npm ci
npm run dev:start
```

Para iniciar sin compilar SCSS: `npm start`.

## Crear instalador

```powershell
npm ci
npm run build
```

Esto compila `src/scss/main.scss` y genera un instalador NSIS x64 en `dist/` con electron-builder. `npm run package` genera una carpeta empaquetada alternativa con electron-packager.

## Publicar actualizaciones OTA

El autoactualizador requiere un ZIP portable completo que contenga el ejecutable y `resources/app.asar`. Publica el ZIP en un release del repositorio y agrega `launcher_sha256` (SHA-256 hexadecimal del archivo completo) al `src/launcher-config.json` remoto junto con `latest_launcher_version` y `launcher_download_url`. La URL debe ser un release de este repositorio. Si el hash no está configurado o no coincide, el cliente cancela la actualización.

No subas tokens. `src/js/scripts/create-release.js` lee `GITHUB_TOKEN` y `GITHUB_REPO` desde el entorno.

`npm run build` también genera `dist/LosPapus-vX.Y.Z.zip` desde `dist/win-unpacked`. Crea el release de GitHub antes de ejecutar `npm run release:upload`; ese comando sube el ZIP y el instalador, y muestra el SHA-256 que necesita la configuración remota.

## Juego

El launcher está fijado en Minecraft 1.21.1 + NeoForge 21.1.265 y Java 21. Para cambiar la versión de NeoForge, actualiza la constante de `src/backend/gameLauncher.js` y el manifiesto de `src/launcher-config.json` juntos; confirma también que los mods del servidor sean compatibles.
