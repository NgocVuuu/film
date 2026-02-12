const MovieList = require('../models/MovieList');
const Movie = require('../models/Movie');

// @desc    Get all user lists
// @route   GET /api/lists
// @access  Private
exports.getLists = async (req, res) => {
    try {
        const checkMovieId = req.query.checkMovie;
        
        let query = MovieList.find({ user: req.user.id }).sort({ createdAt: -1 });
        
        // If simply listening, populate to get thumbnails
        if (!checkMovieId) {
             query = query.populate({
                 path: 'movies.movie',
                 select: 'thumb_url'
             });
        }
        
        const lists = await query;

        // Add a "count" virtual-like property and "hasMovie" flag
        const listsWithDetails = lists.map(list => {
            let count = list.movies ? list.movies.length : 0;
            let hasMovie = false;
            let thumbnails = [];

            if (checkMovieId) {
                // list.movies is array of objects { movie: ObjectId, addedAt... }
                hasMovie = list.movies.some(m => m.movie.toString() === checkMovieId);
            } else {
                 // Get first 4 thumbnails
                 thumbnails = list.movies
                    .filter(item => item.movie) // Ensure movie exists (not deleted)
                    .slice(0, 4)
                    .map(item => item.movie.thumb_url);
            }

            // Clean up output
            const listObj = list.toObject();
           
            // Normalize for frontend
            delete listObj.movies; 

            return {
                ...listObj,
                count,
                hasMovie,
                thumbnails
            };
        });

        res.json({ success: true, lists: listsWithDetails });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Get single list details
// @route   GET /api/lists/:id
// @access  Private
exports.getListById = async (req, res) => {
    try {
        const list = await MovieList.findById(req.params.id)
            .populate({
                path: 'movies.movie',
                select: 'name slug thumb_url origin_name year quality lang'
            });

        if (!list) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy danh sách' });
        }

        if (list.user.toString() !== req.user.id && !list.isPublic) {
            return res.status(403).json({ success: false, message: 'Không có quyền truy cập' });
        }

        res.json({ success: true, list });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Create new list
// @route   POST /api/lists
// @access  Private
exports.createList = async (req, res) => {
    try {
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập tên danh sách' });
        }

        // Check limit (optional)
        const count = await MovieList.countDocuments({ user: req.user.id });
        if (count >= 20) {
            return res.status(400).json({ success: false, message: 'Bạn chỉ được tạo tối đa 20 danh sách' });
        }

        const list = await MovieList.create({
            user: req.user.id,
            name
        });

        res.status(201).json({ success: true, list });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'Tên danh sách đã tồn tại' });
        }
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Update list (rename)
// @route   PUT /api/lists/:id
// @access  Private
exports.updateList = async (req, res) => {
    try {
        const { name } = req.body;
        let list = await MovieList.findById(req.params.id);

        if (!list) return res.status(404).json({ success: false, message: 'Not found' });
        if (list.user.toString() !== req.user.id) return res.status(403).json({ success: false, message: 'Not authorized' });

        list.name = name || list.name;
        await list.save();

        res.json({ success: true, list });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Delete list
// @route   DELETE /api/lists/:id
// @access  Private
exports.deleteList = async (req, res) => {
    try {
        const list = await MovieList.findById(req.params.id);

        if (!list) return res.status(404).json({ success: false, message: 'Not found' });
        if (list.user.toString() !== req.user.id) return res.status(403).json({ success: false, message: 'Not authorized' });

        await list.deleteOne();

        res.json({ success: true, message: 'Đã xóa danh sách' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Add movie to list
// @route   POST /api/lists/:id/movies
// @access  Private
exports.addMovie = async (req, res) => {
    try {
        const { movieId } = req.body;
        const list = await MovieList.findById(req.params.id);

        if (!list) return res.status(404).json({ success: false, message: 'Not found' });
        if (list.user.toString() !== req.user.id) return res.status(403).json({ success: false, message: 'Not authorized' });

        // Check if movie already exists in list
        if (list.movies.some(m => m.movie.toString() === movieId)) {
            return res.status(400).json({ success: false, message: 'Phim đã có trong danh sách' });
        }

        list.movies.unshift({ movie: movieId });
        await list.save();

        res.json({ success: true, list });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Remove movie from list
// @route   DELETE /api/lists/:id/movies/:movieId
// @access  Private
exports.removeMovie = async (req, res) => {
    try {
        const list = await MovieList.findById(req.params.id);

        if (!list) return res.status(404).json({ success: false, message: 'Not found' });
        if (list.user.toString() !== req.user.id) return res.status(403).json({ success: false, message: 'Not authorized' });

        list.movies = list.movies.filter(m => m.movie.toString() !== req.params.movieId);
        await list.save();

        res.json({ success: true, list });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
