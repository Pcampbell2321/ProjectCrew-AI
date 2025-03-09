const express = require('express');
const router = express.Router();
const MeetingActionItemAgent = require('../agents/meetingActionItemAgent');

// Initialize agent
const meetingActionItemAgent = new MeetingActionItemAgent(process.env.ANTHROPIC_API_KEY);

// Route to extract action items from meeting transcript
router.post('/extract', async (req, res) => {
  try {
    const { transcript, context } = req.body;
    
    if (!transcript) {
      return res.status(400).json({ error: 'Meeting transcript is required' });
    }
    
    const actionItems = await meetingActionItemAgent.extractActionItems(transcript, context || {});
    res.json({ actionItems });
  } catch (error) {
    console.error('Error in action item extraction route:', error);
    res.status(500).json({ error: 'Failed to extract action items' });
  }
});

// Route to summarize meeting
router.post('/summarize', async (req, res) => {
  try {
    const { transcript, context } = req.body;
    
    if (!transcript) {
      return res.status(400).json({ error: 'Meeting transcript is required' });
    }
    
    const summary = await meetingActionItemAgent.summarizeMeeting(transcript, context || {});
    res.json({ summary });
  } catch (error) {
    console.error('Error in meeting summary route:', error);
    res.status(500).json({ error: 'Failed to summarize meeting' });
  }
});

module.exports = router;
