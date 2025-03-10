const { google } = require('googleapis');
const SecurityUtils = require('../services/securityUtils');

class GoogleDriveService {
  constructor() {
    this.drive = null;
    this.workFolderId = null;
    this.initialize();
  }

  async initialize() {
    try {
      // Load credentials from environment or a JSON file
      const credentials = {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      };

      // Create a JWT auth client
      const auth = new google.auth.JWT(
        credentials.client_email,
        null,
        credentials.private_key,
        ['https://www.googleapis.com/auth/drive']
      );

      // Initialize the Drive API
      this.drive = google.drive({ version: 'v3', auth });
      
      // Find or create the Work folder
      await this.findOrCreateWorkFolder();
      
      console.log('Google Drive service initialized successfully');
    } catch (error) {
      console.error('Error initializing Google Drive service:', error);
      throw error;
    }
  }

  async findOrCreateWorkFolder() {
    try {
      // Check if Work folder exists
      const response = await this.drive.files.list({
        q: "name='Work' and mimeType='application/vnd.google-apps.folder' and trashed=false",
        fields: 'files(id, name)',
      });

      if (response.data.files.length > 0) {
        this.workFolderId = response.data.files[0].id;
        console.log('Found Work folder with ID:', this.workFolderId);
      } else {
        // Create Work folder if it doesn't exist
        const fileMetadata = {
          name: 'Work',
          mimeType: 'application/vnd.google-apps.folder',
        };

        const folder = await this.drive.files.create({
          resource: fileMetadata,
          fields: 'id',
        });

        this.workFolderId = folder.data.id;
        console.log('Created Work folder with ID:', this.workFolderId);
      }
    } catch (error) {
      console.error('Error finding or creating Work folder:', error);
      throw error;
    }
  }

  async listFiles(subfolder = null) {
    try {
      const folderId = subfolder ? await this.getSubfolderId(subfolder) : this.workFolderId;
      
      const response = await this.drive.files.list({
        q: `'${folderId}' in parents and trashed=false`,
        fields: 'files(id, name, mimeType, createdTime, modifiedTime)',
      });

      return response.data.files;
    } catch (error) {
      console.error('Error listing files:', error);
      throw error;
    }
  }

  async getSubfolderId(subfolderPath) {
    try {
      const folders = subfolderPath.split('/').filter(f => f);
      let parentId = this.workFolderId;

      for (const folder of folders) {
        const response = await this.drive.files.list({
          q: `name='${folder}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
          fields: 'files(id, name)',
        });

        if (response.data.files.length === 0) {
          // Create subfolder if it doesn't exist
          const fileMetadata = {
            name: folder,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [parentId],
          };

          const newFolder = await this.drive.files.create({
            resource: fileMetadata,
            fields: 'id',
          });

          parentId = newFolder.data.id;
        } else {
          parentId = response.data.files[0].id;
        }
      }

      return parentId;
    } catch (error) {
      console.error('Error getting subfolder ID:', error);
      throw error;
    }
  }

  async readFile(fileId) {
    try {
      // First get file metadata to check if it's encrypted
      const metadata = await this.drive.files.get({
        fileId: fileId,
        fields: 'name,properties'
      });
      
      const isEncrypted = metadata.data.properties && 
                          metadata.data.properties.encrypted === 'true';
      
      // Get file content
      const response = await this.drive.files.get({
        fileId: fileId,
        alt: 'media',
      });
      
      let content = response.data;
      
      // Decrypt if necessary
      if (isEncrypted && process.env.ENCRYPTION_KEY) {
        console.log(`Decrypting content for file: ${metadata.data.name}`);
        content = SecurityUtils.decrypt(content, process.env.ENCRYPTION_KEY);
        
        // Try to parse JSON if it looks like JSON
        if (content.startsWith('{') || content.startsWith('[')) {
          try {
            content = JSON.parse(content);
          } catch (e) {
            console.log('Content is not valid JSON after decryption');
          }
        }
      }

      return content;
    } catch (error) {
      console.error('Error reading file:', error);
      throw error;
    }
  }

  async findFileByName(fileName, subfolder = null) {
    try {
      const folderId = subfolder ? await this.getSubfolderId(subfolder) : this.workFolderId;
      
      const response = await this.drive.files.list({
        q: `name='${fileName}' and '${folderId}' in parents and trashed=false`,
        fields: 'files(id, name, mimeType)',
      });

      return response.data.files.length > 0 ? response.data.files[0] : null;
    } catch (error) {
      console.error('Error finding file by name:', error);
      throw error;
    }
  }

  async createFile(fileName, content, mimeType, subfolder = null, modelVersion = 'unknown') {
    try {
      const folderId = subfolder ? await this.getSubfolderId(subfolder) : this.workFolderId;
      const complexityScore = await this.calculateComplexity(content);
      
      // Check if content should be encrypted
      const shouldEncrypt = this.shouldEncryptContent(fileName, mimeType);
      let processedContent = content;
      
      if (shouldEncrypt && process.env.ENCRYPTION_KEY) {
        console.log(`Encrypting sensitive content for file: ${fileName}`);
        const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
        processedContent = SecurityUtils.encrypt(contentStr, process.env.ENCRYPTION_KEY);
        mimeType = 'application/octet-stream'; // Change mime type for encrypted content
      } else {
        processedContent = typeof content === 'string' ? content : JSON.stringify(content);
      }
      
      const fileMetadata = {
        name: fileName,
        parents: [folderId],
        properties: { 
          ai_model: modelVersion,
          complexity_score: complexityScore.toString(),
          encrypted: shouldEncrypt ? 'true' : 'false'
        }
      };

      const media = {
        mimeType: mimeType,
        body: processedContent,
      };

      const response = await this.drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id',
      });

      return response.data.id;
    } catch (error) {
      console.error('Error creating file:', error);
      throw error;
    }
  }

  /**
   * Create a new Google Doc in the Work folder
   * @param {String} title - Document title
   * @param {String} content - Initial document content
   * @param {String} subfolder - Optional subfolder path
   * @returns {Promise<Object>} - Created document metadata
   */
  async createDocument(title, content, subfolder = null) {
    try {
      const folderId = subfolder ? await this.getSubfolderId(subfolder) : this.workFolderId;
      
      const fileMetadata = {
        name: title,
        mimeType: 'application/vnd.google-apps.document',
        parents: [folderId],
      };

      const media = {
        mimeType: 'text/plain',
        body: content,
      };

      const document = await this.drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id, name, webViewLink',
      });

      return document.data;
    } catch (error) {
      console.error('Error creating Google Doc:', error);
      throw error;
    }
  }

  async calculateComplexity(content) {
    // Simple heuristic - adjust based on your needs
    const text = typeof content === 'string' ? content : JSON.stringify(content);
    return Math.min(Math.floor(text.length / 100) + (text.match(/\n/g) || []).length, 100);
  }
  
  /**
   * Determine if content should be encrypted
   * @param {String} fileName - Name of the file
   * @param {String} mimeType - MIME type of the content
   * @returns {Boolean} - Whether content should be encrypted
   */
  shouldEncryptContent(fileName, mimeType) {
    // Encrypt sensitive file types
    const sensitiveTypes = [
      'application/json',
      'text/plain',
      'application/x-yaml',
      'application/xml'
    ];
    
    // Encrypt files with sensitive names
    const sensitivePatterns = [
      /credential/i,
      /secret/i,
      /key/i,
      /password/i,
      /token/i,
      /auth/i,
      /private/i,
      /sensitive/i
    ];
    
    // Check MIME type
    if (sensitiveTypes.includes(mimeType)) {
      // Check filename against patterns
      for (const pattern of sensitivePatterns) {
        if (pattern.test(fileName)) {
          return true;
        }
      }
    }
    
    return false;
  }

  async updateFile(fileId, content, mimeType, modelVersion = 'unknown') {
    try {
      const complexityScore = await this.calculateComplexity(content);
      
      // Update file properties
      await this.drive.files.update({
        fileId: fileId,
        resource: {
          properties: {
            ai_model: modelVersion,
            complexity_score: complexityScore.toString(),
            last_updated: new Date().toISOString()
          }
        }
      });
      
      const media = {
        mimeType: mimeType,
        body: typeof content === 'string' ? content : JSON.stringify(content),
      };

      const response = await this.drive.files.update({
        fileId: fileId,
        media: media,
        fields: 'id',
      });

      return response.data.id;
    } catch (error) {
      console.error('Error updating file:', error);
      throw error;
    }
  }

  async createOrUpdateFile(fileName, content, mimeType, subfolder = null, modelVersion = 'unknown') {
    try {
      const existingFile = await this.findFileByName(fileName, subfolder);
      
      if (existingFile) {
        return await this.updateFile(existingFile.id, content, mimeType, modelVersion);
      } else {
        return await this.createFile(fileName, content, mimeType, subfolder, modelVersion);
      }
    } catch (error) {
      console.error('Error creating or updating file:', error);
      throw error;
    }
  }

  async deleteFile(fileId) {
    try {
      await this.drive.files.delete({
        fileId: fileId,
      });
      
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }
}

// Create a singleton instance
const driveService = new GoogleDriveService();

module.exports = driveService;
