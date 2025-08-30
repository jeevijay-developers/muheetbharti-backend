import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import { configDotenv } from 'dotenv';

configDotenv();
// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Cloudinary Storage for Multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'blog-images', // Folder name in Cloudinary
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
    transformation: [
      {
        width: 1200,
        height: 800,
        crop: 'limit',
        quality: 'auto:good',
        fetch_format: 'auto'
      }
    ],
    public_id: (req, file) => {
      // Generate unique filename
      const timestamp = Date.now();
      const originalName = file.originalname.split('.')[0];
      return `blog_${timestamp}_${originalName}`;
    },
  },
});

// Create multer instance with Cloudinary storage
export const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'), false);
    }
  }
});

// Upload single image to Cloudinary
export const uploadSingleImage = async (file) => {
  try {
    let uploadSource;
    
    // Handle different file sources
    if (file.buffer) {
      // For multer memory storage - convert buffer to base64
      uploadSource = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    } else if (file.path) {
      // For file path uploads
      uploadSource = file.path;
    } else {
      throw new Error('No valid file source found');
    }

    const result = await cloudinary.uploader.upload(uploadSource, {
      folder: 'blog-images',
      transformation: [
        {
          width: 1200,
          height: 800,
          crop: 'limit',
          quality: 'auto:good',
          fetch_format: 'auto'
        }
      ],
      public_id: `blog_${Date.now()}_${file.originalname?.split('.')[0] || 'image'}`,
    });

    return {
      success: true,
      url: result.secure_url,
      public_id: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Upload multiple images to Cloudinary
export const uploadMultipleImages = async (files) => {
  try {
    const uploadPromises = files.map(file => uploadSingleImage(file));
    const results = await Promise.allSettled(uploadPromises);
    
    const successful = results
      .filter(result => result.status === 'fulfilled' && result.value.success)
      .map(result => result.value);
    
    const failed = results
      .filter(result => result.status === 'rejected' || !result.value.success)
      .map(result => ({
        error: result.status === 'rejected' ? result.reason : result.value.error
      }));

    return {
      success: failed.length === 0,
      uploaded: successful,
      failed: failed,
      total: files.length,
      successCount: successful.length,
      failureCount: failed.length
    };
  } catch (error) {
    console.error('Multiple upload error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Upload image from URL (useful for existing images)
export const uploadImageFromUrl = async (imageUrl, options = {}) => {
  try {
    const result = await cloudinary.uploader.upload(imageUrl, {
      folder: 'blog-images',
      transformation: [
        {
          width: 1200,
          height: 800,
          crop: 'limit',
          quality: 'auto:good',
          fetch_format: 'auto'
        }
      ],
      public_id: options.public_id || `blog_${Date.now()}_url_upload`,
      ...options
    });

    return {
      success: true,
      url: result.secure_url,
      public_id: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes
    };
  } catch (error) {
    console.error('Cloudinary URL upload error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Delete image from Cloudinary
export const deleteImage = async (public_id) => {
  try {
    const result = await cloudinary.uploader.destroy(public_id);
    return {
      success: result.result === 'ok',
      result: result.result
    };
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Delete multiple images from Cloudinary
export const deleteMultipleImages = async (public_ids) => {
  try {
    const result = await cloudinary.api.delete_resources(public_ids);
    return {
      success: true,
      deleted: result.deleted,
      deleted_counts: result.deleted_counts,
      partial: result.partial
    };
  } catch (error) {
    console.error('Cloudinary multiple delete error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Get image details from Cloudinary
export const getImageDetails = async (public_id) => {
  try {
    const result = await cloudinary.api.resource(public_id);
    return {
      success: true,
      data: {
        public_id: result.public_id,
        url: result.secure_url,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
        created_at: result.created_at,
        tags: result.tags
      }
    };
  } catch (error) {
    console.error('Cloudinary get details error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Transform image URL (resize, crop, etc.)
export const transformImageUrl = (public_id, transformations = {}) => {
  try {
    const {
      width = 800,
      height = 600,
      crop = 'limit',
      quality = 'auto:good',
      format = 'auto'
    } = transformations;

    const transformedUrl = cloudinary.url(public_id, {
      transformation: [
        {
          width,
          height,
          crop,
          quality,
          fetch_format: format
        }
      ]
    });

    return {
      success: true,
      url: transformedUrl
    };
  } catch (error) {
    console.error('Cloudinary transform error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Get optimized image URL for different screen sizes
export const getResponsiveImageUrls = (public_id) => {
  try {
    return {
      success: true,
      urls: {
        thumbnail: cloudinary.url(public_id, {
          transformation: [{ width: 150, height: 150, crop: 'thumb', quality: 'auto:good' }]
        }),
        small: cloudinary.url(public_id, {
          transformation: [{ width: 400, height: 300, crop: 'limit', quality: 'auto:good' }]
        }),
        medium: cloudinary.url(public_id, {
          transformation: [{ width: 800, height: 600, crop: 'limit', quality: 'auto:good' }]
        }),
        large: cloudinary.url(public_id, {
          transformation: [{ width: 1200, height: 800, crop: 'limit', quality: 'auto:good' }]
        }),
        original: cloudinary.url(public_id, {
          transformation: [{ quality: 'auto:good', fetch_format: 'auto' }]
        })
      }
    };
  } catch (error) {
    console.error('Cloudinary responsive URLs error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Extract public_id from Cloudinary URL
export const extractPublicId = (cloudinaryUrl) => {
  try {
    const matches = cloudinaryUrl.match(/\/([^\/]+)\.[^\/]+$/);
    return matches ? matches[1] : null;
  } catch (error) {
    console.error('Extract public_id error:', error);
    return null;
  }
};

// Validate Cloudinary configuration
export const validateCloudinaryConfig = () => {
  const requiredVars = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error('Missing Cloudinary environment variables:', missing);
    return {
      success: false,
      missing: missing,
      message: 'Please check your environment variables for Cloudinary configuration'
    };
  }
  
  return {
    success: true,
    message: 'Cloudinary configuration is valid'
  };
};

export default cloudinary;
