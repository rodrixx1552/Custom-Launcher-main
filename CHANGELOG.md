# Changelog

All notable changes to this project will be documented in this file.

## [0.5.12] - 2026-11-05
### Fixed
- Disable mods explicitly labeled for Minecraft 1.12–1.20 before launching the 1.21.1 NeoForge profile; keep each original JAR recoverable as `.jar.disable`.

## [0.5.11] - 2026-11-04
### Security
- Store Microsoft access tokens with Electron safeStorage and remove tokens from renderer account data.
- Require a trusted GitHub release URL and matching SHA-256 before offering or applying launcher updates.
- Validate update archives before extraction and restrict external links to HTTPS allowlisted hosts.
- Escape remote and process-provided UI content; validate mod filenames and preserve unmanaged local mods.
### Fixed
- Pin the client to Minecraft 1.21.1, NeoForge 21.1.265, and Java 21.
- Keep remote configuration reads compatible with packaged, read-only application files.
- Align release metadata and document the Windows x64 build process.

## [0.2.0] - 2026-03-17
### Added
- New "LosPapus Lover" UI design with glassmorphism effects.
- Navigation sidebar with interactive tabs.
- Custom logo and background assets.
- Support for Minecraft launching via main process (Secure logic).
- Nickname validation using Regex.
- Content Security Policy (CSP) for improved Electron security.

### Changed
- Refactored frontend to use secure `contextBridge` APIs.
- Updated `package.json` with team information.
- Reorganized asset structure for better maintainability.

### Fixed
- Fixed background and logo rendering issues.
- Fixed insecure Electron warnings in the console.
