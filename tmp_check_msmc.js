const msmc = require('msmc');
console.log('MSMC Keys:', Object.keys(msmc));
if (msmc.Auth) console.log('msmc.Auth type:', typeof msmc.Auth);
if (msmc.default) console.log('msmc.default Keys:', Object.keys(msmc.default));
