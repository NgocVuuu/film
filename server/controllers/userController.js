const User = require('../models/User');
const WatchProgress = require('../models/WatchProgress');

exports.getLeaderboard = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const page = parseInt(req.query.page) || 1;
        const skip = (page - 1) * limit;
        const period = req.query.period || 'all';

        const matchStage = {};
        const now = new Date();
        if (period === 'week') {
            const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
            matchStage.lastWatched = { $gte: startOfWeek };
        } else if (period === 'month') {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
            matchStage.lastWatched = { $gte: startOfMonth };
        }

        // Aggregate total watch time from WatchProgress per user/guest
        const pipeline = [];

        if (Object.keys(matchStage).length > 0) {
            pipeline.push({ $match: matchStage });
        }

        pipeline.push(
            {
                $group: {
                    _id: { $ifNull: ['$userId', '$guestId'] },
                    totalWatchTimeSeconds: { $sum: '$currentTime' },
                    isGuest: { $first: { $cond: [{ $ifNull: ['$userId', false] }, false, true] } },
                    guestId: { $first: '$guestId' }
                }
            },
            {
                $sort: { totalWatchTimeSeconds: -1 }
            },
            {
                $skip: skip
            },
            {
                $limit: limit
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            {
                $unwind: {
                    path: '$user',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    _id: 1,
                    totalWatchTimeSeconds: 1,
                    isGuest: 1,
                    displayName: {
                        $cond: [
                            '$isGuest',
                            { $concat: ['PChiller #', { $substr: [{ $toString: '$_id' }, 0, 5] }] },
                            '$user.displayName'
                        ]
                    },
                    avatar: {
                        $cond: [
                            '$isGuest',
                            null, // Let frontend handle default guest avatar
                            '$user.avatar'
                        ]
                    },
                    createdAt: '$user.createdAt',
                    role: '$user.role'
                }
            },
            {
                $match: {
                    role: { $ne: 'admin' }
                }
            }
        );

        const leaderboard = await WatchProgress.aggregate(pipeline);

        res.json({
            success: true,
            data: leaderboard
        });
    } catch (error) {
        console.error('Get leaderboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi tải bảng xếp hạng'
        });
    }
};
