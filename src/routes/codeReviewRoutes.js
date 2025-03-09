const express = require('express');
const router = express.Router();
const CodeReviewAgent = require('../agents/codeReviewAgent');

// Initialize agent
const codeReviewAgent = new CodeReviewAgent(process.env.ANTHROPIC_API_KEY);

// Route to review code
router.post('/review', async (req, res) => {
  try {
    const { code, language, requirements } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Code snippet is required' });
    }
    
    if (!language) {
      return res.status(400).json({ error: 'Programming language is required' });
    }
    
    const review = await codeReviewAgent.reviewCode(code, language, requirements || {});
    res.json({ review });
  } catch (error) {
    console.error('Error in code review route:', error);
    res.status(500).json({ error: 'Failed to review code' });
  }
});

module.exports = router;
