const { syncAll, addToBlacklist, removeFromBlacklist, getBlacklist, getStatus } = require('../crawler');

// Manual sync trigger
exports.triggerSync = async (req, res) => {
    const { isRunning } = getStatus();
    if (isRunning) {
        return res.status(400).json({
            success: false,
            message: 'Crawler đang chạy. Vui lòng thử lại sau.'
        });
    }

    const { full, pages } = req.body; // { full: true/false, pages: number }

    // Run sync in background
    syncAll({ full, pages }).then(total => {
        console.log(`Manual Sync Finished. Processed ${total} movies.`);
    }).catch(err => {
        console.error('Manual Sync Failed:', err);
    });

    res.json({
        success: true,
        message: full
            ? `Đã kích hoạt CRAWL TẤT CẢ (Max ${pages || 500} trang).`
            : 'Đã kích hoạt đồng bộ nhanh.'
    });
};

// Get crawler status
exports.getCrawlerStatus = (req, res) => {
    const status = getStatus();
    res.json({
        success: true,
        data: status
    });
};

// Get blacklist
exports.getBlacklist = (req, res) => {
    const list = getBlacklist();
    res.json({
        success: true,
        data: list
    });
};

// Add to blacklist
exports.addToBlacklist = (req, res) => {
    const { slug } = req.body;
    if (!slug) {
        return res.status(400).json({ success: false, message: 'Slug không hợp lệ' });
    }
    addToBlacklist(slug);
    res.json({
        success: true,
        message: `Đã thêm ${slug} vào blacklist`
    });
};

// Remove from blacklist
exports.removeFromBlacklist = (req, res) => {
    const { slug } = req.body;
    if (!slug) {
        return res.status(400).json({ success: false, message: 'Slug không hợp lệ' });
    }
    removeFromBlacklist(slug);
    res.json({
        success: true,
        message: `Đã xóa ${slug} khỏi blacklist`
    });
};
