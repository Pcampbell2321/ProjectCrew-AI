const express = require('express');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize Google Drive service
const driveService = require('./src/utils/googleDriveService');

// Import routes
const projectRoutes = require('./src/routes/projectRoutes');
const planningRoutes = require('./src/routes/planningRoutes');
const codeSearchRoutes = require('./src/routes/codeSearchRoutes');
const codeGenerationRoutes = require('./src/routes/codeGenerationRoutes');
const meetingActionItemRoutes = require('./src/routes/meetingActionItemRoutes');
const documentationRoutes = require('./src/routes/documentationRoutes');

// Initialize express
const app = express();
app.use(express.json());

// Register routes
app.use('/api/project', projectRoutes);
app.use('/api/planning', planningRoutes);
app.use('/api/code-search', codeSearchRoutes);
app.use('/api/code-generation', codeGenerationRoutes);
app.use('/api/meeting', meetingActionItemRoutes);
app.use('/api/documentation', documentationRoutes);

// Add a route to check Google Drive connection
app.get('/api/drive/status', async (req, res) => {
  try {
    const files = await driveService.listFiles();
    res.json({ 
      status: 'connected',
      workFolderId: driveService.workFolderId,
      fileCount: files.length
    });
  } catch (error) {
    console.error('Error checking Google Drive status:', error);
    res.status(500).json({ 
      status: 'error',
      message: error.message
    });
  }
});

// Add a route to list files in Google Drive
app.get('/api/drive/files', async (req, res) => {
  try {
    const subfolder = req.query.subfolder || null;
    const files = await driveService.listFiles(subfolder);
    res.json({ files });
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({ error: 'Failed to list files' });
  }
});

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Zoho AI Platform API is running' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
