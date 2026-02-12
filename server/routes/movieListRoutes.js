const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    getLists,
    createList,
    getListById,
    updateList,
    deleteList,
    addMovie,
    removeMovie
} = require('../controllers/movieListController');

router.route('/')
    .get(protect, getLists)
    .post(protect, createList);

router.route('/:id')
    .get(protect, getListById)
    .put(protect, updateList)
    .delete(protect, deleteList);

router.route('/:id/movies')
    .post(protect, addMovie);

router.route('/:id/movies/:movieId')
    .delete(protect, removeMovie);

module.exports = router;
