const fs = require('fs');
const path = require('path');

const pngPath = path.resolve('src/assets/los_papus/logo.png');
const icoPath = path.resolve('src/assets/main.ico');

try {
    const pngBuffer = fs.readFileSync(pngPath);
    
    // Create ICO buffer (simple wrap for single PNG)
    const icoHeader = Buffer.alloc(6);
    icoHeader.writeUInt16LE(0, 0); // Reserved
    icoHeader.writeUInt16LE(1, 2); // Icon type (1)
    icoHeader.writeUInt16LE(1, 4); // Number of images

    const entry = Buffer.alloc(16);
    entry.writeUInt8(0, 0); // Width (0 means 256 or use real value, but 0 is usually okay for large ones)
    entry.writeUInt8(0, 1); // Height
    entry.writeUInt8(0, 2); // Color count
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(0, 6); // Bits per pixel (0 for PNG)
    entry.writeUInt32LE(pngBuffer.length, 8); // Size of image data
    entry.writeUInt32LE(6 + 16, 12); // Offset of image data

    const finalIco = Buffer.concat([icoHeader, entry, pngBuffer]);
    fs.writeFileSync(icoPath, finalIco);
    console.log('ICO generated successfully at:', icoPath);
} catch (e) {
    console.error('ICO generation failed:', e.message);
}
