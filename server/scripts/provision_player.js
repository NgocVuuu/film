const path = require('path');
// load .env from server folder so script picks up API keys when run from repo root
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const manager = require('../utils/hostManager');

// Usage: node provision_player.js Play4Me embed.pchill.online
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: node provision_player.js <HostKey: Play4Me|SeekStreaming> <domain>');
  process.exit(2);
}

const hostKey = args[0];
const domain = args[1];

(async ()=>{
  try {
    const cfg = {
      iframeApi: true,
      ui: { theme: 'dark', accent: '#eab308' }
    };
    // Example ad: a VAST tag hosted on your domain
    const ads = [
      {
        format: 'Vast Tag',
        provider: 'Other',
        status: 'Active',
        content: `https://${process.env.PCHILL_HOSTNAME || 'pchill.online'}/vast/pchill-ad.xml`,
        startTime: '00:00:00'
      }
    ];

    console.log(`Creating player on ${hostKey} for domain ${domain} ...`);
    const res = await manager.createAndConfigurePlayer(hostKey, domain, cfg, ads);
    console.log('Result:', res);
  } catch (e) {
    console.error('Provision failed:', e);
    process.exit(1);
  }
})();
