const express = require('express');
const router = express.Router();
const aiOrchestrator = require('../services/aiOrchestrator');
const driveService = require('../utils/googleDriveService');

/**
 * @route POST /api/ai/process
 * @desc Process a task using the appropriate AI model
 * @access Public
 */
router.post('/process', async (req, res) => {
  try {
    const { task, context } = req.body;
    
    if (!task) {
      return res.status(400).json({ error: 'Task is required' });
    }
    
    const result = await aiOrchestrator.processTask(task, context || {});
    res.json(result);
  } catch (error) {
    console.error('Error processing AI task:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route POST /api/ai/save
 * @desc Save AI result to Google Drive
 * @access Public
 */
router.post('/save', async (req, res) => {
  try {
    const { task, result, timestamp } = req.body;
    
    if (!task || !result) {
      return res.status(400).json({ error: 'Task and result are required' });
    }
    
    // Create a filename based on timestamp and task content
    const taskPreview = typeof task.content === 'string' 
      ? task.content.substring(0, 30).replace(/[^a-z0-9]/gi, '_')
      : 'task';
    const filename = `AI_Result_${new Date().toISOString().replace(/:/g, '-')}_${taskPreview}.json`;
    
    // Save to Google Drive
    const fileId = await driveService.createFile(
      filename,
      { task, result, timestamp },
      'application/json',
      'AI_Results',
      result.model
    );
    
    res.json({ success: true, fileId });
  } catch (error) {
    console.error('Error saving to Drive:', error);
    res.status(500).json({ error: 'Failed to save to Drive' });
  }
});

/**
 * @route POST /api/ai/analyze-complexity
 * @desc Analyze the complexity of a task without processing it
 * @access Public
 */
router.post('/analyze-complexity', async (req, res) => {
  try {
    const { task } = req.body;
    
    if (!task) {
      return res.status(400).json({ error: 'Task is required' });
    }
    
    const complexityScore = await aiOrchestrator.complexityScorer.scoreTask(task);
    
    res.json({
      complexity: complexityScore,
      recommendation: getModelRecommendation(complexityScore)
    });
  } catch (error) {
    console.error('Error analyzing task complexity:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route PUT /api/ai/thresholds
 * @desc Update the thresholds for model selection
 * @access Public
 */
router.put('/thresholds', (req, res) => {
  try {
    const { thresholds } = req.body;
    
    if (!thresholds || typeof thresholds !== 'object') {
      return res.status(400).json({ error: 'Valid thresholds object is required' });
    }
    
    aiOrchestrator.updateThresholds(thresholds);
    res.json({ message: 'Thresholds updated successfully', thresholds: aiOrchestrator.thresholds });
  } catch (error) {
    console.error('Error updating thresholds:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Helper function to get model recommendation based on complexity score
 */
function getModelRecommendation(complexityScore) {
  const thresholds = aiOrchestrator.thresholds;
  
  if (complexityScore <= thresholds.simple) {
    return { model: 'gemini-1.5-flash', tier: 'simple' };
  } else if (complexityScore <= thresholds.medium) {
    return { model: 'gemini-1.5-pro', tier: 'medium' };
  } else if (complexityScore <= thresholds.complex) {
    return { model: 'claude-3-haiku/sonnet', tier: 'complex' };
  } else {
    return { model: 'claude-3-opus', tier: 'very-complex' };
  }
}

module.exports = router;
