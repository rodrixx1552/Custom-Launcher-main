# Changelog

All notable changes to this project will be documented in this file.

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
