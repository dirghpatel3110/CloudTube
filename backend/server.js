const express = require('express');
const mongoose = require('mongoose');
const Video = require('./video');
const cors = require('cors');

const app = express();

// Enhanced CORS configuration
app.use(cors({
  origin: 'http://localhost:5173', // Replace with your frontend's URL
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Length', 'Content-Range'],
}));

// Connect to MongoDB
mongoose.connect('mongodb://host.docker.internal:27017/cloudtube')
  .then(() => console.log('Connected to MongoDB!'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Endpoint to fetch all videos
app.get('/videos', async (req, res) => {
  try {
    const videos = await Video.find();
    res.json(videos);
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Start the server
const PORT = 5007;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
