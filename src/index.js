import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import blogsRouter from './routes/blogs.route.js';

dotenv.config();

const app = express();

// Environment variables
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;
const CLIENT_ADMIN_URL = process.env.CLIENT_ADMIN_URL;
const CLIENT_WEBSITE_URL = process.env.CLIENT_WEBSITE_URL;
const ORIGINS = [CLIENT_ADMIN_URL, CLIENT_WEBSITE_URL];

// CORS configuration
// console.log("ULR ",CLIENT_ADMIN_URL, CLIENT_WEBSITE_URL);

// console.log(CLIENT_ADMIN_URL);

app.options("*", cors()); // handle preflight requests
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: "*",
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/blogs', blogsRouter);

// Basic route
app.get('/',async (req, res) => {
  res.json({
    message: 'Muheet Bharti Portfolio Backend API',
    status: 'Running',
    version: '1.0.0'
  });
});


// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
// Connect to MongoDB
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB successfully');
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  });
});