const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { BlobServiceClient } = require('@azure/storage-blob');
const { getConfig } = require('../utils/config');
const crypto = require('crypto');

let storage;
let blobServiceClient;
let containerName;
let upload;
let configLoaded = false;

function initializeStorage() {
  if (configLoaded) return;
  
  const config = getConfig();
  const isProduction = config.isProduction;
  const isAzureProduction = config.isAzureProduction;

  if (isAzureProduction) {
    blobServiceClient = BlobServiceClient.fromConnectionString(
      config.AZURE_STORAGE_CONNECTION_STRING
    );
    containerName = config.AZURE_STORAGE_CONTAINER_NAME;

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

  const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];

  const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.doc', '.docx', '.xls', '.xlsx'];

  const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const isValidMime = ALLOWED_MIME_TYPES.includes(file.mimetype);
    const isValidExt = ALLOWED_EXTENSIONS.includes(ext);

    if (isValidMime && isValidExt) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`), false);
    }
  };

  upload = multer({ 
    storage: storage,
    limits: { 
      fileSize: 10 * 1024 * 1024,
      files: 10
    },
    fileFilter: fileFilter
  });
  
  configLoaded = true;
}

function getUpload() {
  initializeStorage();
  return upload;
}

const uploadFileToBlob = async (file) => {
  initializeStorage();
  const config = getConfig();
  
  if (!config.isAzureProduction) {
    return file.filename;
  }

  const containerClient = blobServiceClient.getContainerClient(containerName);
  
  await containerClient.createIfNotExists();

  const blobName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  
  await blockBlobClient.uploadData(file.buffer, {
    blobHTTPHeaders: {
      blobContentType: file.mimetype
    }
  });
  
  return blockBlobClient.url;
};

const sanitizeFilename = (filename) => {
  const MAX_FILENAME_LENGTH = 255;
  
  const basename = path.basename(filename);
  
  if (!basename || basename.length === 0) {
    throw new Error('Invalid filename: filename cannot be empty');
  }
  
  const sanitized = basename
    .replace(/[\x00-\x1f\x7f]/g, '_')
    .replace(/["'<>|:*?\\\/]/g, '_')
    .replace(/\r|\n/g, '_');
  
  if (sanitized.length === 0 || sanitized === '.' || sanitized === '..') {
    throw new Error('Invalid filename: filename contains only invalid characters');
  }
  
  if (sanitized.length > MAX_FILENAME_LENGTH) {
    throw new Error(`Invalid filename: filename exceeds maximum length of ${MAX_FILENAME_LENGTH} characters`);
  }
  
  if (sanitized.startsWith('.') || sanitized.endsWith('.')) {
    throw new Error('Invalid filename: cannot start or end with a dot');
  }
  
  if (sanitized.includes('..')) {
    throw new Error('Invalid filename: cannot contain consecutive dots');
  }
  
  return sanitized;
};

const generateUniqueFilename = (baseFilename) => {
  const ext = path.extname(baseFilename);
  const nameWithoutExt = path.basename(baseFilename, ext);
  const timestamp = Date.now();
  const randomId = crypto.randomBytes(4).toString('hex');
  return `${nameWithoutExt}-${timestamp}-${randomId}${ext}`;
};

const getContentTypeFromExtension = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  const contentTypes = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain',
    '.json': 'application/json',
    '.xml': 'application/xml'
  };
  return contentTypes[ext] || 'application/octet-stream';
};

const uploadSignatureToBlob = async (base64Data, filename) => {
  initializeStorage();
  const config = getConfig();
  
  const sanitizedFilename = sanitizeFilename(filename);
  const uniqueFilename = generateUniqueFilename(sanitizedFilename);
  const contentType = getContentTypeFromExtension(uniqueFilename);
  
  if (!config.isAzureProduction) {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    const signaturePath = path.join(uploadDir, uniqueFilename);
    fs.writeFileSync(signaturePath, base64Data, 'base64');
    return uniqueFilename;
  }

  const containerClient = blobServiceClient.getContainerClient(containerName);
  
  await containerClient.createIfNotExists();

  const blockBlobClient = containerClient.getBlockBlobClient(uniqueFilename);
  const buffer = Buffer.from(base64Data, 'base64');
  
  await blockBlobClient.uploadData(buffer, {
    blobHTTPHeaders: {
      blobContentType: contentType
    }
  });
  
  return blockBlobClient.url;
};

module.exports = { 
  get upload() {
    return getUpload();
  },
  get isAzureProduction() {
    initializeStorage();
    return getConfig().isAzureProduction;
  },
  uploadFileToBlob,
  uploadSignatureToBlob,
  sanitizeFilename
};
