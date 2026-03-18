const axios = require('axios');

async function test() {
    const url = 'https://www.mediafire.com/file/la1uhes3g1agnzl/mods.zip/file';
    const r = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
    });
    const html = r.data;
    const p1 = html.match(/"downloadUrl":"([^"]+)"/);
    const p2 = html.match(/aria-label="Download file"[^>]*href="([^"]+)"/i);
    const p3 = html.match(/href="(https?:\/\/download\d*\.mediafire\.com\/[^"]+)"/i);
    const p4 = html.match(/id="downloadButton"[^>]*href="([^"]+)"/i);
    
    console.log('P1 (JS var):', p1 ? p1[1] : 'FAIL');
    console.log('P2 (aria-label):', p2 ? p2[1] : 'FAIL');
    console.log('P3 (download.mediafire):', p3 ? p3[1] : 'FAIL');
    console.log('P4 (downloadButton id):', p4 ? p4[1] : 'FAIL');
    
    if (!p1 && !p2 && !p3 && !p4) {
        // Print relevant chunk of HTML to find patterns
        const idx = html.toLowerCase().indexOf('download');
        console.log('\n--- HTML around download keyword ---');
        console.log(html.substring(idx, idx + 800));
    }
}

test().catch(e => console.error('ERROR:', e.message));
