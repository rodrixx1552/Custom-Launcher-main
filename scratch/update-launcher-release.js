const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const version = process.argv[2] || '';
const sha256 = (process.argv[3] || '').toLowerCase();
if (!/^\d+\.\d+\.\d+$/.test(version) || !/^[a-f0-9]{64}$/.test(sha256)) throw new Error('A valid version and SHA-256 are required.');

const url = `https://github.com/rodrixx1552/Custom-Launcher-main/releases/download/v${version}/LosPapus-v${version}.zip`;
const configPath = path.join(root, 'src', 'launcher-config.json');
const packagePath = path.join(root, 'package.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

Object.assign(config, { launcher_version: version, latest_launcher_version: version, launcher_download_url: url, launcher_sha256: sha256 });
Object.assign(pkg, { version, launcher_version: version, latest_launcher_version: version, launcher_download_url: url, launcher_sha256: sha256 });
fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);
console.log(`Updated launcher channel to ${version}.`);
