const express = require('express');
const router = express.Router();
const {
    getAllNodes,
    createNode,
    updateNode,
    deleteNode
} = require('../controllers/adminNodeController');

const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

const protect = authMiddleware;
const authorize = (role) => {
    return (req, res, next) => {
        if (req.user.role !== role) {
            return res.status(403).json({ success: false, message: 'Bạn không có quyền truy cập' });
        }
        next();
    };
};

router.use(protect);
router.use(authorize('admin')); // Chỉ Admin mới được vào

router.route('/')
    .get(getAllNodes)
    .post(createNode);

router.route('/:id')
    .put(updateNode)
    .delete(deleteNode);

module.exports = router;
