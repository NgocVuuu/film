const axios = require('axios');
const fs = require('fs');

async function searchExact() {
    let out = [];
    const r1 = await axios.get("https://ophim1.com/v1/api/tim-kiem?keyword=Đường Bá Hổ Điểm Thu Hương");
    (r1.data?.data?.items || []).forEach(i => out.push(`[OPHIM] ${i.name} (${i.year}) -> ${i.slug}`));

    const r2 = await axios.get("https://ophim1.com/v1/api/tim-kiem?keyword=Tuyệt Đỉnh Kungfu");
    (r2.data?.data?.items || []).forEach(i => out.push(`[OPHIM] ${i.name} (${i.year}) -> ${i.slug}`));

    const r3 = await axios.get("https://ophim1.com/v1/api/tim-kiem?keyword=Quyết Chiến Giang Hồ");
    (r3.data?.data?.items || []).forEach(i => out.push(`[OPHIM] ${i.name} (${i.year}) -> ${i.slug}`));

    fs.writeFileSync('testExactSearchOut.txt', out.join('\n'));
}
searchExact();
