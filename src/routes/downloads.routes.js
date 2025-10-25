const express = require('express');
const path = require('path');
const fs = require('fs');
const { authMiddleware } = require('../middleware/auth');
const { getConfig } = require('../utils/config');
const { BlobServiceClient } = require('@azure/storage-blob');
const { sanitizeFilename } = require('../infrastructure/storage');

function createDownloadsRoutes(logger) {
  const router = express.Router();
  const config = getConfig();

  router.get('/uploads/:filename', authMiddleware, async (req, res) => {
    try {
      const { filename } = req.params;

      if (!filename || typeof filename !== 'string') {
        logger.warn({ filename }, 'Invalid filename parameter');
        return res.status(400).json({ error: 'Invalid filename' });
      }

      const normalizedFilename = path.basename(filename);
      
      if (normalizedFilename !== filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        logger.warn({ 
          filename, 
          normalizedFilename,
          userId: req.session?.adminUser?.id 
        }, 'Path traversal attempt detected');
        return res.status(403).json({ error: 'Access denied' });
      }

      if (normalizedFilename === '.' || normalizedFilename === '..') {
        logger.warn({ filename, userId: req.session?.adminUser?.id }, 'Invalid filename');
        return res.status(400).json({ error: 'Invalid filename' });
      }

      let safeFilename;
      try {
        safeFilename = sanitizeFilename(normalizedFilename);
      } catch (err) {
        logger.warn({ filename, error: err.message, userId: req.session?.adminUser?.id }, 'Filename sanitization failed');
        return res.status(400).json({ error: 'Invalid filename format' });
      }

      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');

      if (config.isAzureProduction) {
        const blobServiceClient = BlobServiceClient.fromConnectionString(
          config.AZURE_STORAGE_CONNECTION_STRING
        );
        const containerClient = blobServiceClient.getContainerClient(
          config.AZURE_STORAGE_CONTAINER_NAME
        );
        const blobClient = containerClient.getBlobClient(normalizedFilename);

        const exists = await blobClient.exists();
        if (!exists) {
          logger.warn({ 
            filename: normalizedFilename,
            userId: req.session?.adminUser?.id 
          }, 'File not found in Azure storage');
          return res.status(404).json({ error: 'File not found' });
        }

        const downloadResponse = await blobClient.download();
        
        res.setHeader('Content-Type', downloadResponse.contentType || 'application/octet-stream');
        res.setHeader('Content-Length', downloadResponse.contentLength);
        res.attachment(safeFilename);
        
        downloadResponse.readableStreamBody.pipe(res);
        
        logger.info({ 
          filename: safeFilename,
          userId: req.session?.adminUser?.id
        }, 'File downloaded from Azure storage');
        
      } else {
        const filePath = path.join(process.cwd(), 'uploads', normalizedFilename);
        
        const resolvedPath = path.resolve(filePath);
        const uploadsDir = path.resolve(process.cwd(), 'uploads');
        
        if (!resolvedPath.startsWith(uploadsDir + path.sep)) {
          logger.warn({ 
            filename: normalizedFilename,
            resolvedPath,
            uploadsDir,
            userId: req.session?.adminUser?.id 
          }, 'Path traversal attempt - resolved path outside uploads directory');
          return res.status(403).json({ error: 'Access denied' });
        }

        if (!fs.existsSync(filePath)) {
          logger.warn({ 
            filename: normalizedFilename,
            filePath,
            userId: req.session?.adminUser?.id 
          }, 'File not found in local storage');
          return res.status(404).json({ error: 'File not found' });
        }

        const stat = fs.statSync(filePath);
        if (!stat.isFile()) {
          logger.warn({ 
            filename: normalizedFilename,
            userId: req.session?.adminUser?.id 
          }, 'Requested path is not a file');
          return res.status(400).json({ error: 'Invalid file' });
        }

        logger.info({ 
          filename: safeFilename,
          userId: req.session?.adminUser?.id
        }, 'File downloaded from local storage');

        res.download(filePath, safeFilename, (err) => {
          if (err) {
            logger.error({ 
              err,
              filename: safeFilename,
              userId: req.session?.adminUser?.id 
            }, 'Error sending file');
            
            if (!res.headersSent) {
              res.status(500).json({ error: 'Error downloading file' });
            }
          }
        });
      }
    } catch (err) {
      logger.error({ 
        err,
        filename: req.params.filename,
        userId: req.session?.adminUser?.id 
      }, 'Download error');
      
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  return router;
}

module.exports = createDownloadsRoutes;
