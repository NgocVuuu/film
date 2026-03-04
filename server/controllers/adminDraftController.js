const MovieDraft = require('../models/MovieDraft');
const Movie = require('../models/Movie');

exports.getAllDrafts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const drafts = await MovieDraft.find()
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await MovieDraft.countDocuments();

        res.json({
            success: true,
            data: drafts,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Lỗi khi lấy danh sách Phim Nháp:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.publishDraft = async (req, res) => {
    try {
        const { slug } = req.params;

        // 1. Tìm phim trong Nháp
        const draft = await MovieDraft.findOne({ slug });
        if (!draft) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy bộ phim Nháp này' });
        }

        // 2. Kiểm tra xem Web Thật đã có phim này chưa (Check lại lần cuối cho chắc)
        const isExist = await Movie.findOne({ slug });
        if (isExist) {
            let updated = false;

            // Bổ sung thông tin cơ bản nếu bản gốc thiếu (Actor, Director, Poster)
            if (draft.actor && draft.actor.length > 0 && (!isExist.actor || isExist.actor.length === 0)) {
                isExist.actor = draft.actor;
                updated = true;
            }
            if (draft.director && draft.director.length > 0 && (!isExist.director || isExist.director.length === 0)) {
                isExist.director = draft.director;
                updated = true;
            }
            if (draft.poster_url && (!isExist.poster_url || isExist.poster_url.includes('placeholder'))) {
                isExist.poster_url = draft.poster_url;
                isExist.thumb_url = draft.thumb_url || isExist.thumb_url; // Cập nhật luôn thumb nếu có
                updated = true;
            }

            // Bổ sung nguồn Magnet 4K
            if (draft.torrents && draft.torrents.length > 0) {
                // Lọc bỏ torrent trùng lặp magnet
                const newTorrents = draft.torrents.filter(dt => !isExist.torrents.some(et => et.magnet === dt.magnet));
                if (newTorrents.length > 0) {
                    isExist.torrents.push(...newTorrents);
                    updated = true;
                }
            }

            if (updated) {
                await isExist.save();
                await MovieDraft.deleteOne({ slug });
                return res.json({ success: true, message: 'Phim cũ đã có trên Web! Đã tự động BỔ SUNG Siêu dữ liệu/Link 4K Nháp vào phim gốc thành công.', data: isExist });
            } else {
                await MovieDraft.deleteOne({ slug });
                return res.status(400).json({ success: false, message: 'Phim này đã có trên Website và Nháp không có thông tin hay Torrent nào mới. Đã dọn dẹp Nháp.' });
            }
        }

        // 3. Chuẩn bị Dữ liệu để chèn (Chuyển isActive = true để lên web)
        const movieData = draft.toObject();
        delete movieData._id; // Xóa ID cũ của nháp để MongoDB tự tạo ID mới cho bảng xịn
        movieData.isActive = true;

        // 4. Insert vào bảng Movie Thật
        const publishedMovie = new Movie(movieData);
        await publishedMovie.save();

        // 5. Xóa khỏi Bảng Nháp
        await MovieDraft.deleteOne({ slug });

        res.json({ success: true, message: 'Đã DUYỆT LÊN WEB thành công!', data: publishedMovie });
    } catch (error) {
        console.error('Lỗi duyệt phim:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteDraft = async (req, res) => {
    try {
        const { slug } = req.params;

        const result = await MovieDraft.deleteOne({ slug });
        if (result.deletedCount === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy bộ phim Nháp này' });
        }

        res.json({ success: true, message: 'Đã XÓA phim Nháp thành công!' });
    } catch (error) {
        console.error('Lỗi xóa phim nháp:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};
