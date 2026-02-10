
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function processLogo() {
    try {
        const inputPath = path.join(__dirname, 'public', 'logo.jpg');
        const outputPath = path.join(__dirname, 'public', 'logo.png');

        console.log(`Processing: ${inputPath}`);

        if (!fs.existsSync(inputPath)) {
            console.error('Input file NOT found!');
            process.exit(1);
        }

        // Simple approach:
        // 1. Load image
        // 2. Create grayscale version
        // 3. Threshold it to create a mask (black background -> 0, gold -> 255)
        // 4. Apply mask as alpha channel

        // Create mask: 0 for black background, 255 for gold logo
        // threshold(30) means: pixels < 30 become 0, >= 30 become 255.
        const mask = await sharp(inputPath)
            .grayscale()
            .threshold(30)
            .blur(1) // Blur mask slightly for anti-aliasing
            .toBuffer();

        // Apply mask to original image
        await sharp(inputPath)
            .joinChannel(mask)
            .png()
            .toFile(outputPath);

        console.log('Success: created logo.png');

        // Update icons
        const icons = [
            'src/app/icon.png',
            'src/app/apple-icon.png',
            'src/app/opengraph-image.png'
        ];

        for (const icon of icons) {
            fs.copyFileSync(outputPath, path.join(__dirname, icon));
            console.log(`Updated ${icon}`);
        }

    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
}

processLogo();
