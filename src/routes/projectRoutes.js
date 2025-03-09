const express = require('express');
const router = express.Router();
const ProjectUnderstandingAgent = require('../agents/projectUnderstandingAgent');

// Initialize agent
const projectAgent = new ProjectUnderstandingAgent(process.env.GOOGLE_AI_API_KEY);

// Route to process a project document
router.post('/analyze', async (req, res) => {
  try {
    const { document } = req.body;
    
    if (!document) {
      return res.status(400).json({ error: 'Document is required' });
    }
    
    const analysis = await projectAgent.processDocument(document);
    res.json({ analysis });
  } catch (error) {
    console.error('Error in project analysis route:', error);
    res.status(500).json({ error: 'Failed to analyze document' });
  }
});

module.exports = router;