const pngToIco = require('png-to-ico');
const fs = require('fs');
const path = require('path');

const input = 'src/assets/logo_square.png';
const output = 'src/assets/main.ico';

pngToIco(input)
  .then(buffer => {
    fs.writeFileSync(output, buffer);
    console.log(`Icon successfully converted to ${output}`);
  })
  .catch(err => {
    console.error('Error during conversion:', err);
    process.exit(1);
  });
