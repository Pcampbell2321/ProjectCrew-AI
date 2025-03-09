const express = require('express');
const router = express.Router();
const PlanningAgent = require('../agents/planningAgent');

// Initialize agent
const planningAgent = new PlanningAgent(process.env.ANTHROPIC_API_KEY);

// Route to generate tasks from project summary
router.post('/generate-tasks', async (req, res) => {
  try {
    const { projectSummary } = req.body;
    
    if (!projectSummary) {
      return res.status(400).json({ error: 'Project summary is required' });
    }
    
    const tasks = await planningAgent.generateTasks(projectSummary);
    res.json({ tasks });
  } catch (error) {
    console.error('Error in task generation route:', error);
    res.status(500).json({ error: 'Failed to generate tasks' });
  }
});

module.exports = router;