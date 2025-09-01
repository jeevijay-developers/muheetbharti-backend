import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import blogsRouter from './routes/blogs.route.js';

const app = express();

// Environment variables
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;
const CLIENT_ADMIN_URL = process.env.CLIENT_ADMIN_URL;
const CLIENT_WEBSITE_URL = process.env.CLIENT_WEBSITE_URL;

// Debug: Log loaded origins
console.log('CLIENT_ADMIN_URL:', CLIENT_ADMIN_URL);
console.log('CLIENT_WEBSITE_URL:', CLIENT_WEBSITE_URL);

const ORIGINS = [CLIENT_ADMIN_URL, CLIENT_WEBSITE_URL].filter(Boolean); // Remove undefined

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like Postman, curl)
    if (!origin || ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
       console.error('Blocked by CORS:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/blogs', blogsRouter);

// Basic route
app.get('/', (req, res) => {
  res.json({
    message: 'Muheet Bharti Portfolio Backend API',
    status: 'Running',
    version: '1.0.0'
  });
});

// Start server and connect to MongoDB
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

  if (!MONGO_URI) {
    console.error('MONGO_URI is not defined in environment variables.');
    process.exit(1);
  }

  mongoose.connect(MONGO_URI)
    .then(() => {
      console.log('Connected to MongoDB successfully');
    })
    .catch((error) => {
      console.error('MongoDB connection error:', error);
      process.exit(1);
    });
});