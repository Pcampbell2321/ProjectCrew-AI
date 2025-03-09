const express = require('express');
const router = express.Router();
const CodeGenerationAgent = require('../agents/codeGenerationAgent');

// Initialize agent
const codeGenerationAgent = new CodeGenerationAgent(process.env.ANTHROPIC_API_KEY);

// Route to generate Deluge code based on requirements
router.post('/generate', async (req, res) => {
  try {
    const { requirements, context } = req.body;
    
    if (!requirements) {
      return res.status(400).json({ error: 'Requirements are required' });
    }
    
    const generatedCode = await codeGenerationAgent.generateCode(requirements, context || {});
    res.json({ code: generatedCode });
  } catch (error) {
    console.error('Error in code generation route:', error);
    res.status(500).json({ error: 'Failed to generate code' });
  }
});

// Route to improve existing code
router.post('/improve', async (req, res) => {
  try {
    const { code, requirements } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Existing code is required' });
    }
    
    const improvedCode = await codeGenerationAgent.improveCode(code, requirements || '');
    res.json({ code: improvedCode });
  } catch (error) {
    console.error('Error in code improvement route:', error);
    res.status(500).json({ error: 'Failed to improve code' });
  }
});

module.exports = router;
