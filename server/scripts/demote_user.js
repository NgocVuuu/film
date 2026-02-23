const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const result = await mongoose.connection.db.collection('users').updateOne(
        { email: 'ngocvu14.3.2001@gmail.com' },
        { $set: { role: 'user' } }
    );
    console.log('Matched:', result.matchedCount, '| Modified:', result.modifiedCount);
    if (result.matchedCount === 0) {
        console.log('Không tìm thấy tài khoản với email này.');
    } else if (result.modifiedCount === 1) {
        console.log('Đã đổi role thành user thành công.');
    } else {
        console.log('Role đã là user rồi, không cần thay đổi.');
    }
    await mongoose.disconnect();
    process.exit(0);
}).catch(e => {
    console.error('Lỗi:', e.message);
    process.exit(1);
});
