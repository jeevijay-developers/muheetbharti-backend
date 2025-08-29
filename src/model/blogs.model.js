import mongoose from 'mongoose';

const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  banner: {
    type: String,
    required: true,
    trim: true
  },
  images: [{
    type: String,
    trim: true
  }],
  subtitle: {
    type: String,
    trim: true,
    maxlength: 300
  },
  body: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  visibility: {
    type: String,
    enum: ['public', 'private', 'draft'],
    default: 'draft'
  },
  slug: {
    type: String,
    unique: true,
    trim: true
  },
  author: {
    type: String,
    default: 'Muheet Bharti'
  },
  readTime: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Create slug from title before saving
blogSchema.pre('save', function(next) {
  if (this.isModified('title')) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .replace(/\s+/g, '-')
      .trim('-');
  }
  
  // Calculate read time (average 200 words per minute)
  if (this.body) {
    const wordCount = this.body.split(/\s+/).length;
    this.readTime = Math.ceil(wordCount / 200);
  }
  
  next();
});

// Index for better search performance
blogSchema.index({ title: 'text', subtitle: 'text', body: 'text' });
blogSchema.index({ tags: 1 });
blogSchema.index({ visibility: 1 });
blogSchema.index({ date: -1 });

const Blog = mongoose.model('Blog', blogSchema);

export default Blog;