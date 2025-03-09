const express = require('express');
const router = express.Router();
const PlanningAgent = require('../agents/planningAgent');
const driveService = require('../utils/googleDriveService');

// Initialize agent
const planningAgent = new PlanningAgent(process.env.ANTHROPIC_API_KEY);

// Route to generate tasks from project summary
router.post('/generate-tasks', async (req, res) => {
  try {
    const { projectSummary, projectName } = req.body;
    
    if (!projectSummary) {
      return res.status(400).json({ error: 'Project summary is required' });
    }
    
    const tasks = await planningAgent.generateTasks(projectSummary, projectName || 'Project');
    res.json({ tasks });
  } catch (error) {
    console.error('Error in task generation route:', error);
    res.status(500).json({ error: 'Failed to generate tasks' });
  }
});

// Route to get tasks from Google Drive
router.get('/tasks', async (req, res) => {
  try {
    const files = await driveService.listFiles('Tasks');
    res.json({ files });
  } catch (error) {
    console.error('Error listing tasks:', error);
    res.status(500).json({ error: 'Failed to list tasks' });
  }
});

// Route to get a specific task file
router.get('/tasks/:fileName', async (req, res) => {
  try {
    const { fileName } = req.params;
    const file = await driveService.findFileByName(fileName, 'Tasks');
    
    if (!file) {
      return res.status(404).json({ error: 'Task file not found' });
    }
    
    const content = await driveService.readFile(file.id);
    res.json({ content });
  } catch (error) {
    console.error('Error getting task file:', error);
    res.status(500).json({ error: 'Failed to get task file' });
  }
});

module.exports = router;
