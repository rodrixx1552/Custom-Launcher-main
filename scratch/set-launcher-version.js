const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const version = process.argv[2] || '';
if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Version must use semantic versioning, for example 0.5.13.');

const packagePath = path.join(root, 'package.json');
const lockPath = path.join(root, 'package-lock.json');
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));

function parts(value) { return String(value).split('.').map(Number); }
function newer(candidate, current) {
    const next = parts(candidate);
    const previous = parts(current);
    for (let i = 0; i < 3; i++) {
        if (next[i] > previous[i]) return true;
        if (next[i] < previous[i]) return false;
    }
    return false;
}

if (!newer(version, pkg.version)) throw new Error(`Version ${version} must be newer than the current build ${pkg.version}.`);
pkg.version = version;
pkg.launcher_version = version;
lock.version = version;
if (lock.packages?.['']) lock.packages[''] = { ...lock.packages[''], version };
fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);
fs.writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
console.log(`Prepared launcher version ${version}.`);
