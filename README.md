# LosPapus Launcher

Launcher de escritorio para la instancia comunitaria de Minecraft **1.21.1 con NeoForge 21.1.265**. La versión del juego y el cargador están fijados para que el cliente y el modpack mantengan una combinación compatible.

## Requisitos

- Windows 10/11 x64 para ejecutar y compilar el instalador.
- Node.js 22.12 o superior y npm para desarrollo.
- Conexión a Internet para autenticación Microsoft, descarga de Java 21, NeoForge y archivos del juego.
- Java 21 se descarga automáticamente si no se configura una instalación local.

## Desarrollo

```powershell
npm ci
npm run dev:start
```

`npm run dev:start` compila SCSS y abre Electron. Para ejecutar sin recompilar estilos: `npm start`.

## Instalador de producción

```powershell
npm ci
npm run build
```

El instalador NSIS se genera en `dist/`. El build requiere Windows x64 y los recursos de compilación de Electron disponibles. La opción `package` genera un directorio empaquetado con electron-packager, no un instalador NSIS.

## Configuración del juego

- Minecraft: `1.21.1`.
- NeoForge: `21.1.265`.
- Java: 21.
- El cliente instala el cargador desde el Maven oficial de NeoForged.
- `src/launcher-config.json` contiene la dirección del servidor y metadatos de publicación.
- `src/mods.json` es el manifiesto de mods administrados; cada entrada requiere `name` y `sha256` (SHA-256 hexadecimal del `.jar`). No se borran mods locales que no estén en el manifiesto.

## Actualizaciones

Las actualizaciones del launcher solo se ofrecen cuando el manifiesto remoto incluye una URL HTTPS de release de este repositorio, versión semántica y `launcher_sha256` válido. El hash debe ser SHA-256 del ZIP exacto publicado. Sin ese hash configurado el actualizador se mantiene desactivado por seguridad.

## Datos y cuentas

Los tokens Microsoft se guardan cifrados con el almacenamiento seguro del sistema operativo. Los builds anteriores podían guardarlos en texto plano; el launcher nuevo los migra al arrancar cuando el cifrado del sistema está disponible y elimina tokens heredados de `localStorage`.

## Publicación

Antes de publicar una versión:

1. Actualiza `version` en `package.json` y el `launcher_version` de `src/launcher-config.json`.
2. Compila el instalador y prepara el ZIP portable requerido por el actualizador.
3. Calcula el SHA-256 del ZIP y añádelo como `launcher_sha256` al manifiesto remoto `src/launcher-config.json`.
4. Verifica que el enlace sea del formato `https://github.com/rodrixx1552/Custom-Launcher-main/releases/download/vX.Y.Z/...`.

`npm run build` prepara el instalador y el ZIP portable. Crea primero el release correspondiente en GitHub y luego, con `GITHUB_TOKEN` y `GITHUB_REPO=owner/repo` definidos en el entorno, ejecuta `npm run release:upload`. El script no crea releases ni sobrescribe assets existentes; muestra el hash del ZIP para que se publique en la configuración remota.

No guardes tokens de GitHub en el código. El script auxiliar de releases usa `GITHUB_TOKEN` y `GITHUB_REPO` del entorno.

## Limitaciones conocidas

- La compilación y distribución están configuradas para Windows x64.
- NeoForge 21.1.265 y el conjunto de mods deben corresponder a Minecraft 1.21.1.
- Los mods ejecutan código dentro de Minecraft; instala únicamente archivos de fuentes confiables.

## Licencia

Apache-2.0. Consulta [LICENCE](LICENCE).
