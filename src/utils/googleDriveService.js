const { google } = require('googleapis');

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
      const response = await this.drive.files.get({
        fileId: fileId,
        alt: 'media',
      });

      return response.data;
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

  async createFile(fileName, content, mimeType, subfolder = null) {
    try {
      const folderId = subfolder ? await this.getSubfolderId(subfolder) : this.workFolderId;
      
      const fileMetadata = {
        name: fileName,
        parents: [folderId],
      };

      const media = {
        mimeType: mimeType,
        body: typeof content === 'string' ? content : JSON.stringify(content),
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

  async updateFile(fileId, content, mimeType) {
    try {
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

  async createOrUpdateFile(fileName, content, mimeType, subfolder = null) {
    try {
      const existingFile = await this.findFileByName(fileName, subfolder);
      
      if (existingFile) {
        return await this.updateFile(existingFile.id, content, mimeType);
      } else {
        return await this.createFile(fileName, content, mimeType, subfolder);
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
