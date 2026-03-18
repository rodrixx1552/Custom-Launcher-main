const { Jimp } = require('jimp');
const pngToIco = require('png-to-ico');
const fs = require('fs');
const path = require('path');

async function fixIcon() {
    try {
        const logoPath = path.join(__dirname, 'src', 'assets', 'los_papus', 'logo.png');
        const img = await Jimp.read(logoPath);
        
        // Autocrop removes transparent borders padding the actual image.
        // This will make the logo take the maximum amount of space inside the app icon.
        img.autocrop();
        
        // Resize to a square container while maintaining aspect ratio
        const size = Math.max(img.bitmap.width, img.bitmap.height);
        
        // Create a new blank square image. Jimp defaults to transparent (0x00000000)
        const square = new Jimp({ width: size, height: size, color: 0x00000000 });
        
        // Calculate center coordinates
        const xMode = (size - img.bitmap.width) / 2;
        const yMode = (size - img.bitmap.height) / 2;
        
        // Paste cropped logo exactly into the center
        square.composite(img, xMode, yMode);
        
        // Save the perfected square padding as a temp png
        const tempPath = path.join(__dirname, 'temp_icon.png');
        await square.write(tempPath);
        
        // Convert to highly scaled ICO
        const buf = await pngToIco(tempPath);
        fs.writeFileSync(path.join(__dirname, 'src', 'assets', 'main.ico'), buf);
        console.log("Icon perfectly cropped, squared and updated!");
        
        fs.unlinkSync(tempPath); // cleanup
    } catch (e) {
        console.error(e);
    }
}

fixIcon();
