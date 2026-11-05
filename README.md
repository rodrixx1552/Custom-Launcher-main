# LosPapus Launcher

Launcher de escritorio para la instancia comunitaria de LosPapus. El perfil global de Minecraft, NeoForge, Java y mods se publica desde el panel de administración para que los usuarios mantengan la misma combinación compatible.

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
- Java: 21 para el perfil inicial; perfiles publicados pueden elegir Java 17 o 21.
- El cliente instala el cargador desde el Maven oficial de NeoForged.
- `src/launcher-config.json` contiene la dirección del servidor y metadatos de publicación.
- `src/modpack.json` es la fuente de verdad versionada para Minecraft, NeoForge, Java y los mods administrados.
- El launcher consulta el perfil en cada inicio, descarga los mods que falten o cambien, comprueba SHA-256 y aplica la versión seleccionada antes de lanzar Minecraft. Los JAR que no pertenezcan al perfil se mueven a `.lospapus-minecraft/mod-backups` para evitar mezclar mods de versiones distintas; conserva las tres copias más recientes.

## Actualizaciones

Las actualizaciones del launcher solo se ofrecen cuando el manifiesto remoto incluye una URL HTTPS de release de este repositorio, versión semántica y `launcher_sha256` válido. El hash debe ser SHA-256 del ZIP exacto publicado. Sin ese hash configurado el actualizador se mantiene desactivado por seguridad.

## Panel de administración

El panel se publica con GitHub Pages en `https://rodrixx1552.github.io/Custom-Launcher-main/admin/` una vez integrados los cambios en `main`. Permite administrar el perfil global del modpack y publicar ZIP portables del launcher.

1. Crea un fine-grained personal access token en GitHub con acceso únicamente a `Custom-Launcher-main`, permisos `Contents: Read and write` y `Actions: Read and write`, y una fecha de caducidad.
2. Abre el panel e inicia sesión con el token. El panel valida que la cuenta sea `rodrixx1552`, no guarda el token y lo mantiene solo en la memoria de la pestaña.
3. En **Modpack**, añade o quita JAR, incrementa la versión y selecciona Minecraft, NeoForge y Java. Publica; el panel sube los archivos a un release versionado y cambia el perfil activo en un commit.
4. En **Launcher**, elige una versión nueva y pulsa **Construir y publicar**. GitHub Actions compila el instalador y el ZIP portable en Windows, crea el release, calcula su hash y actualiza el canal de autoactualización.

El panel está servido como sitio estático; GitHub Pages no protege el HTML con una barrera de acceso. La pantalla de administración y sus operaciones exigen un token de `rodrixx1552`, y GitHub valida los permisos de escritura. El token nunca se guarda en el sitio ni se debe compartir. La release de launcher se compila con el flujo `Publish launcher` y el token `GITHUB_TOKEN` limitado que GitHub crea para cada ejecución.

## Datos y cuentas

Los tokens Microsoft se guardan cifrados con el almacenamiento seguro del sistema operativo. Los builds anteriores podían guardarlos en texto plano; el launcher nuevo los migra al arrancar cuando el cifrado del sistema está disponible y elimina tokens heredados de `localStorage`.

## Publicación

Para las publicaciones habituales, usa el [panel de administración](https://rodrixx1552.github.io/Custom-Launcher-main/admin/). La acción manual `npm run build` sigue disponible para desarrollo local; las releases públicas del launcher se compilan mediante el flujo `Publish launcher`.

## Limitaciones conocidas

- La compilación y distribución están configuradas para Windows x64.
- Minecraft, NeoForge, Java y los mods deben corresponder a la combinación que publique el panel.
- Los mods ejecutan código dentro de Minecraft; instala únicamente archivos de fuentes confiables.

## Licencia

Apache-2.0. Consulta [LICENCE](LICENCE).
