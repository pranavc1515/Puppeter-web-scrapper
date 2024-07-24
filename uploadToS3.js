const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
require('dotenv').config();

// Configure AWS with your access and secret key.
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME;
const LOCAL_DIR = 'D:\\puppeteer-scrap\\scrapped-data';

// Function to upload a single file
const uploadFile = async (filePath) => {
    const fileContent = fs.readFileSync(filePath);
    const s3Key = path.relative(LOCAL_DIR, filePath).replace(/\\/g, '/');

    const params = {
        Bucket: BUCKET_NAME,
        Key: `scrapped-data/${s3Key}`,
        Body: fileContent,
    };

    try {
        await s3.upload(params).promise();
        console.log(`Successfully uploaded: ${filePath}`);
    } catch (err) {
        console.error(`Error uploading ${filePath}:`, err);
    }
};

// Function to recursively upload files from a directory
const uploadDirectory = async (directoryPath) => {
    const files = await readdir(directoryPath, { withFileTypes: true });

    const uploadPromises = files.map(async (file) => {
        const fullPath = path.join(directoryPath, file.name);
        const fileStat = await stat(fullPath);

        if (fileStat.isDirectory()) {
            await uploadDirectory(fullPath);
        } else {
            return uploadFile(fullPath);
        }
    });

    await Promise.all(uploadPromises);
};

// Start uploading from the root directory
(async () => {
    try {
        await uploadDirectory(LOCAL_DIR);
        console.log('All files uploaded successfully.');
    } catch (error) {
        console.error('Error uploading files:', error);
    }
})();
