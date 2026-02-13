const webPush = require('web-push');

console.log('Generating VAPID keys for Web Push Notifications...\n');

const vapidKeys = webPush.generateVAPIDKeys();

console.log('✅ VAPID keys generated successfully!\n');
console.log('Add these to your .env file:\n');
console.log('─'.repeat(80));
console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log(`VAPID_EMAIL=mailto:admin@yourdomain.com`);
console.log('─'.repeat(80));
console.log('\n⚠️  IMPORTANT:');
console.log('1. Copy these keys to your .env file');
console.log('2. Keep the private key SECRET - never commit to git');
console.log('3. Replace the VAPID_EMAIL with your actual email');
console.log('4. Restart your server after adding the keys\n');
