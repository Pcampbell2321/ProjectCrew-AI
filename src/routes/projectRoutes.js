const express = require('express');
const router = express.Router();
const ProjectUnderstandingAgent = require('../agents/projectUnderstandingAgent');
const driveService = require('../utils/googleDriveService');

// Initialize agent
const projectAgent = new ProjectUnderstandingAgent(process.env.GOOGLE_AI_API_KEY);

// Route to process a project document from Google Drive
router.post('/analyze', async (req, res) => {
  try {
    const { document, documentName, documentId } = req.body;
    
    if (!document && !documentName && !documentId) {
      return res.status(400).json({ error: 'Either document content, documentName, or documentId is required' });
    }
    
    let analysis;
    if (document) {
      // Process direct document content
      analysis = await projectAgent.processDocument({ content: document, name: documentName || 'document' });
    } else {
      // Process document from Google Drive
      analysis = await projectAgent.processDocument(documentId || documentName, !!documentId);
    }
    
    res.json({ analysis });
  } catch (error) {
    console.error('Error in project analysis route:', error);
    res.status(500).json({ error: 'Failed to analyze document' });
  }
});

// Route to list project documents in Google Drive
router.get('/documents', async (req, res) => {
  try {
    const subfolder = req.query.subfolder || null;
    const files = await driveService.listFiles(subfolder);
    res.json({ files });
  } catch (error) {
    console.error('Error listing documents:', error);
    res.status(500).json({ error: 'Failed to list documents' });
  }
});

// Route to upload a project document to Google Drive
router.post('/upload', async (req, res) => {
  try {
    const { fileName, content, subfolder } = req.body;
    
    if (!fileName || !content) {
      return res.status(400).json({ error: 'File name and content are required' });
    }
    
    const fileId = await driveService.createOrUpdateFile(
      fileName,
      content,
      'text/plain',
      subfolder || null
    );
    
    res.json({ fileId });
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

module.exports = router;
