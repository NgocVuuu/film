const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/pchill';
const BACKUP_DIR = path.join(__dirname, '../backups');

const connectDB = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('MongoDB Connected for Backup');
    } catch (err) {
        console.error('MongoDB Connection Error:', err);
        process.exit(1);
    }
};

const backup = async () => {
    await connectDB();

    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const backupPath = path.join(BACKUP_DIR, timestamp);

    if (!fs.existsSync(backupPath)) {
        fs.mkdirSync(backupPath, { recursive: true });
    }

    try {
        const collections = await mongoose.connection.db.listCollections().toArray();

        for (const collection of collections) {
            const name = collection.name;
            const data = await mongoose.connection.db.collection(name).find({}).toArray();

            fs.writeFileSync(
                path.join(backupPath, `${name}.json`),
                JSON.stringify(data, null, 2)
            );
            console.log(`Backed up ${name}: ${data.length} documents`);
        }

        console.log(`Backup completed successfully to ${backupPath}`);
        // Keep only last 5 backups
        cleanOldBackups();

    } catch (err) {
        console.error('Backup failed:', err);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
};

const cleanOldBackups = () => {
    const backups = fs.readdirSync(BACKUP_DIR).sort().reverse();
    if (backups.length > 5) {
        backups.slice(5).forEach(dir => {
            const dirPath = path.join(BACKUP_DIR, dir);
            fs.rmSync(dirPath, { recursive: true, force: true });
            console.log(`Deleted old backup: ${dir}`);
        });
    }
};

backup();
