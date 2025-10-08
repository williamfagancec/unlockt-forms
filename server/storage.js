const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { BlobServiceClient } = require('@azure/storage-blob');

const isProduction = process.env.NODE_ENV === 'production' 
  || !!process.env.WEBSITE_INSTANCE_ID 
  || !!process.env.REPLIT_DEPLOYMENT;

const isAzureProduction = isProduction && process.env.AZURE_STORAGE_CONNECTION_STRING;

let storage;
let blobServiceClient;
let containerName;

if (isAzureProduction) {
  blobServiceClient = BlobServiceClient.fromConnectionString(
    process.env.AZURE_STORAGE_CONNECTION_STRING
  );
  containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'uploads';

  storage = multer.memoryStorage();
} else {
  storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = 'uploads';
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  });
}

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

const uploadFileToBlob = async (file) => {
  if (!isAzureProduction) {
    return file.filename;
  }

  const containerClient = blobServiceClient.getContainerClient(containerName);
  
  await containerClient.createIfNotExists({
    access: 'blob'
  });

  const blobName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  
  await blockBlobClient.uploadData(file.buffer, {
    blobHTTPHeaders: {
      blobContentType: file.mimetype
    }
  });
  
  return blockBlobClient.url;
};

const uploadSignatureToBlob = async (base64Data, filename) => {
  if (!isAzureProduction) {
    const signaturePath = path.join('uploads', filename);
    
    if (!fs.existsSync('uploads')) {
      fs.mkdirSync('uploads', { recursive: true });
    }
    
    fs.writeFileSync(signaturePath, base64Data, 'base64');
    return filename;
  }

  const containerClient = blobServiceClient.getContainerClient(containerName);
  
  await containerClient.createIfNotExists({
    access: 'blob'
  });

  const blockBlobClient = containerClient.getBlockBlobClient(filename);
  const buffer = Buffer.from(base64Data, 'base64');
  
  await blockBlobClient.uploadData(buffer, {
    blobHTTPHeaders: {
      blobContentType: 'image/png'
    }
  });
  
  return blockBlobClient.url;
};

module.exports = { 
  upload, 
  isAzureProduction,
  uploadFileToBlob,
  uploadSignatureToBlob
};
