const express = require('express');
const router = express.Router();
const CodeSearchAgent = require('../agents/codeSearchAgent');

// Initialize agent
const codeSearchAgent = new CodeSearchAgent(process.env.ANTHROPIC_API_KEY);

// Route to search code based on natural language query
router.post('/search', async (req, res) => {
  try {
    const { query, context } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    const searchResults = await codeSearchAgent.searchCode(query, context || {});
    res.json({ results: searchResults });
  } catch (error) {
    console.error('Error in code search route:', error);
    res.status(500).json({ error: 'Failed to search code', message: error.message });
  }
});

// Route to get code explanation
router.post('/explain', async (req, res) => {
  try {
    const { code, language, context } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Code snippet is required' });
    }
    
    const explanation = await codeSearchAgent.explainCode(code, language || 'javascript', context || {});
    res.json({ explanation });
  } catch (error) {
    console.error('Error in code explanation route:', error);
    res.status(500).json({ error: 'Failed to explain code', message: error.message });
  }
});

// Route to generate code from description
router.post('/generate', async (req, res) => {
  try {
    const { description, language, context } = req.body;
    
    if (!description) {
      return res.status(400).json({ error: 'Description is required' });
    }
    
    if (!language) {
      return res.status(400).json({ error: 'Programming language is required' });
    }
    
    const generatedCode = await codeSearchAgent.generateCode(description, language, context || {});
    res.json({ code: generatedCode });
  } catch (error) {
    console.error('Error in code generation route:', error);
    res.status(500).json({ error: 'Failed to generate code', message: error.message });
  }
});

module.exports = router;
