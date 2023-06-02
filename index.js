const express = require('express');
const cors = require('cors');
const fs = require('fs');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const AWS = require('aws-sdk');
const mongoose = require('mongoose');

require('dotenv').config();

const app = express();
const port = 3000;

// Set up CORS
app.use(cors());

// Set up JSON parsing
app.use(express.json());

// Connect to MongoDB using Mongoose
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('Failed to connect to MongoDB', err));

// Define the Image model
const imageSchema = new mongoose.Schema({
    filename: String,
    url: String,
  });
  
  const Image = mongoose.model('Image', imageSchema);
  

// Set up S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

// Set up Multer for file uploads
const storage = multer.memoryStorage();
//const upload = multer({ storage });

//restricting image file
const fileFilter = (req, file, cb) => {
  const allowedFileTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  if (allowedFileTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, JPG, and PNG files are allowed.'));
  }
};
const upload = multer({ storage, fileFilter });

// Example route for uploading an image
app.post('/upload', upload.single('image'), async (req, res) => {
  try {
    // Get the file data from the request
    const { originalname, mimetype, buffer } = req.file;

    // Generate a unique filename
    const filename = Date.now() + '-' + originalname;

    // Upload the file to S3
    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: filename,
      Body: buffer,
      ContentType: mimetype,
    //   ACL: 'public-read-write',
    };
    // console.log(params);

    await s3.upload(params).promise();

    //Save the image details to MongoDB
    const image = new Image({
      filename,
      url: `https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/${filename}`,
    });

    console.log(image)
    await image.save();

    res.json({ message: 'Image uploaded successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Example route for retrieving all images
app.get('/images', async (req, res) => {
  try {
    const images = await Image.find();
    console.log(images)
    res.json(images);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve images' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
