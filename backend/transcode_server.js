const express = require('express');
require('dotenv').config();
const app = express();
const AWS = require('aws-sdk');
const mongoose = require('mongoose');
const kafka = require('kafka-node');
const { KafkaClient, Consumer } = kafka;

const kafkaConsumer = () => {
  const client = new KafkaClient({ kafkaHost: 'kafka:9092' });
  const consumer = new Consumer(
    client,
    [{ topic: 'transcode', partition: 0 }],
    { autoCommit: true }
  );

  consumer.on('message', async function (message) {
    console.log('Received message:', message.value);
    const res = JSON.parse(message.value);
    const fileName = res.fileName;
    await transcode(fileName)
    console.log("Done")

  });

  consumer.on('error', function (err) {
    console.error('Error:', err);
  });

  consumer.on('offsetOutOfRange', function (topic) {
    console.error('Offset out of range:', topic);
  });
};

kafkaConsumer()
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_BUCKET_REGION,
  useAccelerateEndpoint: true,
});


mongoose.connect('mongodb://host.docker.internal:27017/cloudtube')
.then(() => console.log('Connected!'));

const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const fs = require('fs');
const path = require('path');
const Video = require('./video');
const { default: axios } = require('axios');
ffmpeg.setFfmpegPath(ffmpegStatic);
require('dotenv').config();
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffprobePath = require('@ffprobe-installer/ffprobe').path;

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

  
const Bucket = process.env.AWS_BUCKET_NAME;
const cloudFrontUrl = process.env.AWS_CLOUD_FRONT_URL // Your CloudFront URL

const getObjectFromCloudFrontWithRetry = async (url, maxRetries = 5, delay = 100) => {
  let attempts = 0;

  while (attempts < maxRetries) {
    try {
      const response = await axios({
        method: 'get',
        url: url,
        responseType: 'stream'
      });

      return response.data;
    } catch (error) {
      attempts += 1;
      console.log(`Attempt ${attempts} failed. Retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }

  throw new Error('Max retries reached. Could not get object from CloudFront.');
};

const transcode = async (fileName) => {
  try {
    console.log('Starting transcoding for:', fileName);

    // Ensure only the file name is used
    fileName = path.basename(fileName);

    // Define a unique directory for temporary files
    const tempDir = path.join('/tmp', path.basename(fileName, '.mp4'));
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const inputFilePath = path.join(tempDir, fileName);

    // Check if a directory or file exists at `inputFilePath`
    if (fs.existsSync(inputFilePath)) {
      const stats = fs.lstatSync(inputFilePath);
      if (stats.isDirectory()) {
        console.warn(`Warning: ${inputFilePath} is a directory. Removing it.`);
        fs.rmSync(inputFilePath, { recursive: true, force: true });
      } else {
        console.log(`Warning: ${inputFilePath} already exists as a file. Deleting it.`);
        fs.unlinkSync(inputFilePath); // Remove existing file
      }
    }

    // Fetch video from CloudFront using AWS SDK v2
    const videoUrl = `${cloudFrontUrl}/${fileName}`;
    console.log('Fetching video from:', videoUrl);

    // Download video from S3 to local storage
    const downloadParams = {
      Bucket,
      Key: fileName,
    };

    // Use AWS SDK v2 to get the object from S3
    const data = await s3.getObject(downloadParams).promise();

    // Write the file to local storage
    try {
      fs.writeFileSync(inputFilePath, data.Body);
      console.log('File downloaded successfully:', inputFilePath);
    } catch (error) {
      console.error('Failed to write file:', error);
      throw error;
    }

    // Define resolutions for transcoding
    const resolutions = [
      { suffix: '1080p', size: '1920x1080', audioBitrate: '192k' },
      { suffix: '720p', size: '1280x720', audioBitrate: '128k' },
      { suffix: '480p', size: '854x480', audioBitrate: '96k' },
      { suffix: '360p', size: '640x360', audioBitrate: '96k' },
      { suffix: '240p', size: '426x240', audioBitrate: '64k' },
      { suffix: '144p', size: '256x144', audioBitrate: '48k' },
    ];

    // Start video processing
    await processVideo(inputFilePath, tempDir, resolutions, async () => {
      await writeAndUploadMasterPlaylist(tempDir, resolutions, Bucket, path.basename(fileName, '.mp4'), async () => {
        console.log('Video processing and uploading completed');

        // Update video URL in database
        const video = await Video.findOne({ url: videoUrl });
        if (video) {
          video.url = `${cloudFrontUrl}/${path.basename(fileName, '.mp4')}/master.m3u8`;
          await video.save();
          console.log('Video URL updated in database:', video.url);
        } else {
          console.error('Video not found in database');
        }
      });
    });
  } catch (error) {
    console.error('Failed to process video:', error);
  }
};


  async function processVideo(inputFilePath, outputDir, resolutions, callback) {
    // Validate the input file before processing
    const isValid = await validateVideo(inputFilePath);
    if (!isValid) {
      throw new Error('Invalid or corrupted input file');
    }
  
    // Map each resolution to a Promise for processing
    let allProcesses = resolutions.map((resolution) => {
      return new Promise((resolve, reject) => {
        console.log(`Starting processing for resolution: ${resolution.suffix}`);
        
        ffmpeg(inputFilePath)
          .outputOptions([
            '-profile:v baseline',         // Baseline profile for compatibility
            '-c:v libx264',               // Use H.264 codec (correct encoder)
            '-level 3.0',                 // Level 3.0 for compatibility
            `-s ${resolution.size}`,      // Set resolution (e.g., 1280x720)
            `-b:a ${resolution.audioBitrate}`, // Set audio bitrate
            '-c:a aac',                   // Use AAC audio codec
            '-start_number 0',            // Start HLS segment numbering from 0
            '-hls_time 10',               // Set HLS segment duration to 10 seconds
            '-hls_list_size 0',           // Include all segments in the playlist
            '-f hls'                      // Output format is HLS
          ])
          .output(`${outputDir}/output_${resolution.suffix}.m3u8`) // Output file path
          .on('start', (commandLine) => {
            console.log(`FFmpeg command for ${resolution.suffix}:`, commandLine);
          })
          .on('progress', (progress) => {
            console.log(`Processing ${resolution.suffix}: ${progress.timemark}`);
          })
          .on('end', () => {
            console.log(`Processing finished successfully for ${resolution.suffix}!`);
            resolve(); // Resolve the promise on successful completion
          })
          .on('error', (err, stdout, stderr) => {
            console.error(`Error processing resolution ${resolution.suffix}:`, err.message);
            console.error(`FFmpeg stderr for ${resolution.suffix}:\n${stderr || 'No stderr output'}`);
            reject(err); // Reject the promise on error
          })
          .run(); // Start FFmpeg process
      });
    });
  
    // Wait for all FFmpeg processes to complete
    Promise.all(allProcesses)
      .then(() => {
        console.log('All resolutions processed successfully!');
        callback(); // Call the callback function after successful processing
      })
      .catch((error) => {
        console.error('Failed processing some of the resolutions:', error);
      });
  }
  
  // Helper function to validate input video file using ffprobe
  async function validateVideo(filePath) {
    return new Promise((resolve) => {
      ffmpeg.ffprobe(filePath, (err) => {
        if (err) {
          console.error('FFprobe validation error:', err.message);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }
  
  
  

  
  
  async function writeAndUploadMasterPlaylist(outputDir, resolutions, bucketName, fileName, callback) {
    const masterContent = [
      '#EXTM3U',
      '#EXT-X-VERSION:3'
    ];
  
    resolutions.forEach(res => {
      const bandwidth = calculateBandwidth(res.size, res.audioBitrate);
      masterContent.push(`#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${res.size}`);
      masterContent.push(`${cloudFrontUrl}/${fileName}/output_${res.suffix}.m3u8`);
    });
  
    const playlistContent = masterContent.join('\n');
    const localPlaylistPath = `${outputDir}/master.m3u8`;
  
    fs.writeFileSync(localPlaylistPath, playlistContent, 'utf8');
    console.log('Master playlist written locally:', localPlaylistPath);
  
    await uploadDirToS3(outputDir, `${fileName}/`, async() => {
      await uploadFileToS3(localPlaylistPath, bucketName, `${fileName}/master.m3u8`, callback);
    });
  }
  
  async function uploadDirToS3(dir, s3Path, callback) {
    fs.readdir(dir, (err, files) => {
      if (err) {
        console.error('Could not list the directory.', err);
        return;
      }
  
      let uploadPromises = files.map(file => {
        return new Promise((resolve, reject) => {
          const filePath = path.join(dir, file);
          const contentType = file.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/MP2T';
          const params = {
            Bucket,
            Key: `${s3Path}${file}`,
            Body: fs.createReadStream(filePath),
            ContentType: contentType
          };
  
          s3.upload(params, (s3Err, data) => {
            if (s3Err) {
              console.log("Error uploading data: ", s3Err);
              reject(s3Err);
            } else {
              console.log(`Successfully uploaded data to ${data.Location}`);
              resolve();
            }
          });
        });
      });
  
      Promise.all(uploadPromises)
        .then(() => {
          console.log('All files uploaded successfully.');
          callback();
        })
        .catch(error => console.error('Failed to upload some files:', error));
    });
  }
  
  async function uploadFileToS3(filePath, bucketName, key, callback) {
    const fileContent = fs.readFileSync(filePath);
    const params = {
      Bucket: bucketName,
      Key: key,
      Body: fileContent,
      ContentType: 'application/vnd.apple.mpegurl'
    };
  
    await s3.upload(params, function (err, data) {
      if (err) {
        console.log("Error uploading data: ", err);
      } else {
        console.log("Successfully uploaded data to " + data.Location);
        callback();
      }
    });
  }
  
  function calculateBandwidth(resolution, audioBitrate) {
    const videoBase = {
      '1920x1080': 5000,
      '1280x720': 2500,
      '854x480': 1000,
      '640x360': 750,
      '426x240': 400,
      '256x144': 300
    };
    const audioBase = parseInt(audioBitrate, 10) / 1000;
    return (videoBase[resolution] + audioBase) * 1000; // Return in bits per second
  }

const PORT = 3006;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports.s3=s3;