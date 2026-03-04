const axios = require('axios');

async function sendTelegramAlert(message) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
        console.log('\n=========================================');
        console.log('🚨 [pChill System Alert (Telegram Not Configured)]');
        console.log(message);
        console.log('=========================================\n');
        return;
    }

    try {
        const url = `https://api.telegram.org/bot${token}/sendMessage`;
        await axios.post(url, {
            chat_id: chatId,
            text: `🚨 <b>[pChill System Alert]</b>\n\n${message}`,
            parse_mode: 'HTML'
        });
    } catch (error) {
        console.error('[Telegram Alert] Failed to send message:', error.message);
    }
}

module.exports = { sendTelegramAlert };
