const express = require('express');
const mongoose = require('mongoose');
const Video = require('./video');
const cors = require('cors');

const app = express();
app.use(cors());

// Connect to MongoDB
mongoose.connect('mongodb://host.docker.internal:27017/cloudtube')
   .then(() => console.log('Connected!'));

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
const PORT = 5007;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
