import express from 'express';
import multer from 'multer';
import {
  getAllBlogs,
  getBlogById,
  createBlog,
  updateBlog,
  deleteBlog,
  getBlogsByTag,
  uploadImage,
  uploadMultipleImagesEndpoint,
  uploadImageFromUrlEndpoint,
  deleteImageEndpoint,
  getBlogBySlug
} from '../controller/blogs.controller.js';

// Configure multer for memory storage (Cloudinary will handle the upload)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

const router = express.Router();

// Basic routes first
router.get('/', getAllBlogs);
router.post('/', upload.single('image'), createBlog);

// Image upload routes
router.post('/upload-image', upload.single('image'), uploadImage);
router.post('/upload/multiple', upload.array('images', 10), uploadMultipleImagesEndpoint);
router.post('/upload/url', uploadImageFromUrlEndpoint);
router.delete('/image/:publicId', deleteImageEndpoint);

// Specific routes before parameterized ones
router.get('/tag/:tag', getBlogsByTag);

// Parameterized routes last
router.get('/:id', getBlogById);
router.put('/:id', upload.single('image'), updateBlog);
router.delete('/:id', deleteBlog);
router.get('/slug/:slug', getBlogBySlug);

export default router;