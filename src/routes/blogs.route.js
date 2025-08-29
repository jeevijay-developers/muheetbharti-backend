import express from 'express';
import {
  getAllBlogs,
  getBlogById,
  createBlog,
  updateBlog,
  deleteBlog,
  getBlogsByTag
} from '../controller/blogs.controller.js';

const router = express.Router();

// Basic routes first
router.get('/', getAllBlogs);
router.post('/', createBlog);

// Specific routes before parameterized ones
router.get('/tag/:tag', getBlogsByTag);

// Parameterized routes last
router.get('/:id', getBlogById);
router.put('/:id', updateBlog);
router.delete('/:id', deleteBlog);

export default router;