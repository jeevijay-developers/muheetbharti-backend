import Blog from '../model/blogs.model.js';
import { 
  uploadSingleImage, 
  uploadMultipleImages, 
  uploadImageFromUrl,
  deleteImage,
  deleteMultipleImages,
  extractPublicId 
} from '../utils/cloudinary.js';

// Get all blogs with optional filtering
export const getAllBlogs = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      visibility, 
      tags, 
      search 
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (visibility) {
      filter.visibility = visibility;
    }
    
    if (tags) {
      filter.tags = { $in: tags.split(',') };
    }
    
    if (search) {
      filter.$text = { $search: search };
    }

    const options = {
      page: parseInt(page),
      // limit: parseInt(limit),
      sort: { date: -1 },
      populate: 'author'
    };

    const blogs = await Blog.find(filter)
      .sort({ date: -1 })
      // .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Blog.countDocuments(filter);
    // console.log(`Total blogs found: ${total}`);

    res.status(200).json({
      success: true,
      data: blogs,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching blogs',
      error: error.message
    });
  }
};

// Get single blog by ID or slug
export const getBlogById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Try to find by ID first, then by slug
    let blog = await Blog.findById(id);
    if (!blog) {
      blog = await Blog.findOne({ slug: id });
    }
    
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }

    res.status(200).json({
      success: true,
      data: blog
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching blog',
      error: error.message
    });
  }
};

// Create new blog
export const createBlog = async (req, res) => {
  try {
    const {
      title,
      banner,
      images,
      subtitle,
      body,
      date,
      tags,
      visibility
    } = req.body;

    // Validate required fields
    if (!title || !body) {
      return res.status(400).json({
        success: false,
        message: 'Title and body are required'
      });
    }

    let bannerData = { public_id: "", url: "" };
    let imageData = [];

    // Handle banner image upload if it's a file
    if (req.files && req.files.banner) {
      const bannerUpload = await uploadSingleImage(req.files.banner[0]);
      if (bannerUpload.success) {
        bannerData = {
          public_id: bannerUpload.public_id,
          url: bannerUpload.url
        };
      } else {
        return res.status(400).json({
          success: false,
          message: 'Failed to upload banner image',
          error: bannerUpload.error
        });
      }
    } else if (banner && typeof banner === 'string' && banner.startsWith('http') && !banner.includes('cloudinary.com')) {
      // Upload from URL if it's not already a Cloudinary URL
      const bannerUpload = await uploadImageFromUrl(banner);
      if (bannerUpload.success) {
        bannerData = {
          public_id: bannerUpload.public_id,
          url: bannerUpload.url
        };
      }
    } else if (banner && typeof banner === 'object' && banner.url) {
      // Use existing banner data if it's already in the correct format
      bannerData = banner;
    }

    // Handle additional images upload
    if (req.files && req.files.images) {
      const imagesUpload = await uploadMultipleImages(req.files.images);
      if (imagesUpload.success || imagesUpload.uploaded.length > 0) {
        imageData = imagesUpload.uploaded.map(img => ({
          public_id: img.public_id,
          url: img.url
        }));
      }
      if (imagesUpload.failed && imagesUpload.failed.length > 0) {
        console.warn('Some images failed to upload:', imagesUpload.failed);
      }
    } else if (images && Array.isArray(images)) {
      // Handle images from URLs or existing data
      const processedImages = await Promise.all(
        images.map(async (image) => {
          if (typeof image === 'string' && image.startsWith('http') && !image.includes('cloudinary.com')) {
            // Upload from URL
            const upload = await uploadImageFromUrl(image);
            return upload.success ? {
              public_id: upload.public_id,
              url: upload.url
            } : null;
          } else if (typeof image === 'object' && image.url) {
            // Use existing image data
            return image;
          } else if (typeof image === 'string' && image.includes('cloudinary.com')) {
            // Extract public_id from existing Cloudinary URL
            const publicId = extractPublicId(image);
            return {
              public_id: publicId || "",
              url: image
            };
          }
          return null;
        })
      );
      imageData = processedImages.filter(img => img !== null);
    }

    const blog = new Blog({
      title,
      banner: bannerData,
      images: imageData,
      subtitle,
      body,
      date: date || new Date(),
      tags: tags || [],
      visibility: visibility || 'draft'
    });

    const savedBlog = await blog.save();

    res.status(201).json({
      success: true,
      message: 'Blog created successfully',
      data: savedBlog
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating blog',
      error: error.message
    });
  }
};

// Update blog
export const updateBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Get existing blog to compare images
    const existingBlog = await Blog.findById(id);
    if (!existingBlog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }

    // Handle banner image update
    if (req.files && req.files.banner) {
      // Delete old banner if it exists and has a public_id
      if (existingBlog.banner && existingBlog.banner.public_id) {
        await deleteImage(existingBlog.banner.public_id);
      }

      // Upload new banner
      const bannerUpload = await uploadSingleImage(req.files.banner[0]);
      if (bannerUpload.success) {
        updateData.banner = {
          public_id: bannerUpload.public_id,
          url: bannerUpload.url
        };
      } else {
        return res.status(400).json({
          success: false,
          message: 'Failed to upload banner image',
          error: bannerUpload.error
        });
      }
    } else if (updateData.banner && typeof updateData.banner === 'string' && updateData.banner.startsWith('http') && !updateData.banner.includes('cloudinary.com')) {
      // Upload from URL if it's not already a Cloudinary URL
      const bannerUpload = await uploadImageFromUrl(updateData.banner);
      if (bannerUpload.success) {
        updateData.banner = {
          public_id: bannerUpload.public_id,
          url: bannerUpload.url
        };
      }
    } else if (updateData.banner && typeof updateData.banner === 'object' && updateData.banner.url) {
      // Keep existing banner data if it's already in the correct format
      updateData.banner = updateData.banner;
    }

    // Handle additional images update
    if (req.files && req.files.images) {
      // Delete old images if they exist and have public_ids
      if (existingBlog.images && existingBlog.images.length > 0) {
        const oldImagePublicIds = existingBlog.images
          .filter(img => img.public_id)
          .map(img => img.public_id);
        
        if (oldImagePublicIds.length > 0) {
          await deleteMultipleImages(oldImagePublicIds);
        }
      }

      // Upload new images
      const imagesUpload = await uploadMultipleImages(req.files.images);
      if (imagesUpload.success || imagesUpload.uploaded.length > 0) {
        updateData.images = imagesUpload.uploaded.map(img => ({
          public_id: img.public_id,
          url: img.url
        }));
      }
      if (imagesUpload.failed && imagesUpload.failed.length > 0) {
        console.warn('Some images failed to upload:', imagesUpload.failed);
      }
    } else if (updateData.images && Array.isArray(updateData.images)) {
      // Handle images from URLs or existing data
      const processedImages = await Promise.all(
        updateData.images.map(async (image) => {
          if (typeof image === 'string' && image.startsWith('http') && !image.includes('cloudinary.com')) {
            // Upload from URL
            const upload = await uploadImageFromUrl(image);
            return upload.success ? {
              public_id: upload.public_id,
              url: upload.url
            } : null;
          } else if (typeof image === 'object' && image.url) {
            // Use existing image data
            return image;
          } else if (typeof image === 'string' && image.includes('cloudinary.com')) {
            // Extract public_id from existing Cloudinary URL
            const publicId = extractPublicId(image);
            return {
              public_id: publicId || "",
              url: image
            };
          }
          return null;
        })
      );
      updateData.images = processedImages.filter(img => img !== null);
    }

    const blog = await Blog.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Blog updated successfully',
      data: blog
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating blog',
      error: error.message
    });
  }
};

// Delete blog
export const deleteBlog = async (req, res) => {
  try {
    const { id } = req.params;

    const blog = await Blog.findById(id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }

    // Delete associated images from Cloudinary
    const imagesToDelete = [];
    
    // Add banner to deletion list if it has a public_id
    if (blog.banner && blog.banner.public_id) {
      imagesToDelete.push(blog.banner.public_id);
    }

    // Add other images to deletion list if they have public_ids
    if (blog.images && blog.images.length > 0) {
      const imagePublicIds = blog.images
        .filter(img => img.public_id)
        .map(img => img.public_id);
      
      imagesToDelete.push(...imagePublicIds);
    }

    // Delete images from Cloudinary
    if (imagesToDelete.length > 0) {
      await deleteMultipleImages(imagesToDelete);
    }

    // Delete blog from database
    await Blog.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Blog deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting blog',
      error: error.message
    });
  }
};

// Get blogs by tag
export const getBlogsByTag = async (req, res) => {
  try {
    const { tag } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const blogs = await Blog.find({ 
      tags: tag,
      visibility: 'public'
    })
      .sort({ date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Blog.countDocuments({ 
      tags: tag,
      visibility: 'public'
    });

    res.status(200).json({
      success: true,
      data: blogs,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching blogs by tag',
      error: error.message
    });
  }
};

// Upload single image endpoint
export const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    const uploadResult = await uploadSingleImage(req.file);

    if (uploadResult.success) {
      res.status(200).json({
        success: true,
        message: 'Image uploaded successfully',
        image: {
          public_id: uploadResult.public_id,
          url: uploadResult.url
        },
        data: {
          url: uploadResult.url,
          public_id: uploadResult.public_id,
          width: uploadResult.width,
          height: uploadResult.height,
          format: uploadResult.format,
          bytes: uploadResult.bytes
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to upload image',
        error: uploadResult.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error uploading image',
      error: error.message
    });
  }
};

// Upload multiple images endpoint
export const uploadMultipleImagesEndpoint = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No image files provided'
      });
    }

    const uploadResult = await uploadMultipleImages(req.files);

    res.status(200).json({
      success: uploadResult.success,
      message: uploadResult.success ? 'Images uploaded successfully' : 'Some images failed to upload',
      data: {
        uploaded: uploadResult.uploaded,
        failed: uploadResult.failed,
        total: uploadResult.total,
        successCount: uploadResult.successCount,
        failureCount: uploadResult.failureCount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error uploading images',
      error: error.message
    });
  }
};

// Upload image from URL endpoint
export const uploadImageFromUrlEndpoint = async (req, res) => {
  try {
    const { imageUrl, options = {} } = req.body;

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'Image URL is required'
      });
    }

    const uploadResult = await uploadImageFromUrl(imageUrl, options);

    if (uploadResult.success) {
      res.status(200).json({
        success: true,
        message: 'Image uploaded from URL successfully',
        data: {
          url: uploadResult.url,
          public_id: uploadResult.public_id,
          width: uploadResult.width,
          height: uploadResult.height,
          format: uploadResult.format,
          bytes: uploadResult.bytes
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to upload image from URL',
        error: uploadResult.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error uploading image from URL',
      error: error.message
    });
  }
};

// Delete image endpoint
export const deleteImageEndpoint = async (req, res) => {
  try {
    const { public_id } = req.params;

    if (!public_id) {
      return res.status(400).json({
        success: false,
        message: 'Public ID is required'
      });
    }

    const deleteResult = await deleteImage(public_id);

    if (deleteResult.success) {
      res.status(200).json({
        success: true,
        message: 'Image deleted successfully',
        data: deleteResult
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to delete image',
        error: deleteResult.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting image',
      error: error.message
    });
  }
};

// Get blog by slug
export const getBlogBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const blog = await Blog.findOne({ slug });

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }

    res.status(200).json({
      success: true,
      data: blog
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching blog by slug',
      error: error.message
    });
  }
};