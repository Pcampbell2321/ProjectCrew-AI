const express = require('express');
const router = express.Router();
const DocumentationAgent = require('../agents/documentationAgent');

// Initialize agent
const documentationAgent = new DocumentationAgent(process.env.ANTHROPIC_API_KEY);

// Route to update documentation with new information
router.post('/update', async (req, res) => {
  try {
    const { document, changes, context } = req.body;
    
    if (!document || !changes) {
      return res.status(400).json({ error: 'Document and changes are required' });
    }
    
    const updatedDocument = await documentationAgent.updateDocument(document, changes, context || {});
    res.json({ updatedDocument });
  } catch (error) {
    console.error('Error in documentation update route:', error);
    res.status(500).json({ error: 'Failed to update documentation' });
  }
});

// Route to generate new documentation
router.post('/generate', async (req, res) => {
  try {
    const { topic, details, format } = req.body;
    
    if (!topic || !details) {
      return res.status(400).json({ error: 'Topic and details are required' });
    }
    
    const documentation = await documentationAgent.generateDocumentation(topic, details, format || 'markdown');
    res.json({ documentation });
  } catch (error) {
    console.error('Error in documentation generation route:', error);
    res.status(500).json({ error: 'Failed to generate documentation' });
  }
});

module.exports = router;
