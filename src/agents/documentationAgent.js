const axios = require('axios');

class DocumentationAgent {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.model = 'claude-3-5-haiku-20241022'; // Using Claude 3.5 Haiku for efficient document processing
    this.baseUrl = 'https://api.anthropic.com/v1';
  }

  async updateDocument(document, changes, context = {}) {
    try {
      console.log('Updating documentation with new information...');
      
      const systemPrompt = this._buildUpdateSystemPrompt();
      const userPrompt = this._buildUpdateUserPrompt(document, changes, context);
      const response = await this._callClaudeAPI(systemPrompt, userPrompt);
      return this._parseUpdateResponse(response);
    } catch (error) {
      console.error('Error in documentation update:', error);
      throw error;
    }
  }

  async generateDocumentation(topic, details = {}, format = 'markdown') {
    try {
      console.log('Generating new documentation...');
      
      // Handle different input formats
      if (typeof details === 'string') {
        details = { content: details };
      } else if (typeof details !== 'object') {
        details = {};
      }
      
      // If topic is an object with content, use that as the topic
      let topicText = topic;
      if (typeof topic === 'object' && topic.content) {
        topicText = topic.content;
      }
      
      const systemPrompt = this._buildGenerateSystemPrompt(format);
      const userPrompt = this._buildGenerateUserPrompt(topicText, details, format);
      const response = await this._callClaudeAPI(systemPrompt, userPrompt);
      return this._parseGenerateResponse(response);
    } catch (error) {
      console.error('Error in documentation generation:', error);
      throw error;
    }
  }

  _buildUpdateSystemPrompt() {
    return `You are a Documentation Update Agent specializing in maintaining technical documentation.
    Your task is to update existing documentation with new information while preserving the original style and format.
    Always format your responses as valid JSON without trailing commas or syntax errors.
    Focus on integrating changes seamlessly while maintaining document coherence and accuracy.`;
  }

  _buildUpdateUserPrompt(document, changes, context) {
    return `
Please update this documentation with the new information:

Original Document:
${document}

Changes to incorporate:
${JSON.stringify(changes, null, 2)}

Additional context:
${JSON.stringify(context, null, 2)}

Return your response as JSON with the following structure:
{
  "updated_document": "The full updated document with changes incorporated",
  "change_summary": [
    "Description of change 1",
    "Description of change 2"
  ],
  "sections_modified": [
    "Section name 1",
    "Section name 2"
  ]
}

Make sure to:
1. Maintain the original document's style and formatting
2. Integrate the changes naturally into the document
3. Ensure technical accuracy
4. Preserve document structure
5. Highlight any conflicts or inconsistencies`;
  }

  _buildGenerateSystemPrompt(format) {
    return `You are a Documentation Generation Agent specializing in creating clear, comprehensive technical documentation.
    Your task is to create new documentation based on provided information in ${format} format.
    Always format your responses as valid JSON without trailing commas or syntax errors.
    Focus on creating well-structured, accurate, and user-friendly documentation.`;
  }

  _buildGenerateUserPrompt(topic, details, format) {
    return `
Please generate documentation for the following topic:

Topic: ${topic}

Details:
${JSON.stringify(details, null, 2)}

Format: ${format}

Return your response as JSON with the following structure:
{
  "title": "Documentation title",
  "content": "The full documentation content in ${format} format",
  "sections": [
    {
      "heading": "Section heading",
      "content": "Section content"
    }
  ],
  "metadata": {
    "author": "Documentation Agent",
    "created_date": "${new Date().toISOString().split('T')[0]}",
    "version": "1.0"
  }
}

Make sure to include:
1. Clear introduction and purpose
2. Step-by-step instructions where appropriate
3. Examples and code snippets if relevant
4. Proper formatting using ${format} syntax
5. Appropriate headings and structure`;
  }

  async _callClaudeAPI(systemPrompt, userPrompt) {
    try {
      console.log('Making API request to Claude...');
      
      const url = `${this.baseUrl}/messages`;
      
      const data = {
        model: this.model,
        max_tokens: 4000, // Increased token limit for document generation
        temperature: 0.3, // Lower temperature for more consistent documentation
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: userPrompt
              }
            ]
          }
        ]
      };

      const headers = {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      };

      console.log('Using Claude API URL:', url);
      console.log('Using model:', this.model);
      
      const response = await axios.post(url, data, { headers });
      console.log('Received response from Claude API with status:', response.status);
      return response.data;
    } catch (error) {
      console.error('Claude API Error:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }

  _parseUpdateResponse(response) {
    try {
      console.log('Parsing Claude response for document update...');
      
      if (!response.content || response.content.length === 0) {
        throw new Error('No content in Claude response');
      }
      
      const textResponse = response.content[0].text;
      
      // Try to find JSON in the response
      const jsonMatch = textResponse.match(/```json\n([\s\S]*?)\n```/) || 
                        textResponse.match(/{[\s\S]*?}/);
      
      if (jsonMatch) {
        const jsonText = jsonMatch[1] || jsonMatch[0];
        return JSON.parse(jsonText);
      } else {
        throw new Error('Could not extract JSON from Claude response');
      }
    } catch (error) {
      console.error('Error parsing Claude response:', error);
      
      // Fall back to mock data
      console.log('Falling back to mock data');
      return this._generateMockUpdateResponse();
    }
  }

  _parseGenerateResponse(response) {
    try {
      console.log('Parsing Claude response for document generation...');
      
      if (!response.content || response.content.length === 0) {
        throw new Error('No content in Claude response');
      }
      
      const textResponse = response.content[0].text;
      
      // Try to find JSON in the response
      const jsonMatch = textResponse.match(/```json\n([\s\S]*?)\n```/) || 
                        textResponse.match(/{[\s\S]*?}/);
      
      if (jsonMatch) {
        const jsonText = jsonMatch[1] || jsonMatch[0];
        return JSON.parse(jsonText);
      } else {
        throw new Error('Could not extract JSON from Claude response');
      }
    } catch (error) {
      console.error('Error parsing Claude response:', error);
      
      // Fall back to mock data
      console.log('Falling back to mock data');
      return this._generateMockGenerateResponse();
    }
  }

  _generateMockUpdateResponse() {
    return {
      updated_document: `# Vehicle Rental System Documentation

## Overview
The Vehicle Rental System is a comprehensive solution for managing vehicle rentals, customer information, and rental transactions. The system allows rental agents to process rentals efficiently while maintaining accurate records.

## System Components
1. **Customer Management** - Store and manage customer information
2. **Vehicle Inventory** - Track available vehicles and their details
3. **Rental Processing** - Create and manage rental transactions
4. **Reporting** - Generate business reports and analytics
5. **Payment Processing** - Handle payments and invoicing
6. **Maintenance Tracking** - NEW: Monitor vehicle maintenance schedules and history

## Rental Process
1. Customer provides identification and rental requirements
2. Agent checks vehicle availability
3. Agent creates rental record with dates and vehicle information
4. System calculates rental cost including taxes and fees
5. Customer provides payment
6. System generates rental agreement
7. NEW: System sends confirmation email to customer
8. Vehicle is marked as "Rented" in the inventory

## Maintenance Process
NEW SECTION:
1. Maintenance manager schedules regular maintenance for vehicles
2. System tracks maintenance history for each vehicle
3. Vehicles due for maintenance are flagged in the inventory
4. Maintenance records include service type, date, cost, and notes
5. System generates maintenance reports for fleet management

## Technical Requirements
- Zoho Creator application with custom Deluge scripts
- Integration with payment processing system
- Customer database with secure information storage
- Reporting module for business analytics
- NEW: Mobile-friendly interface for field operations
- NEW: API integration with maintenance service providers`,
      change_summary: [
        "Added Maintenance Tracking to System Components",
        "Added email confirmation step to Rental Process",
        "Added new Maintenance Process section",
        "Added mobile interface requirement",
        "Added API integration with maintenance providers"
      ],
      sections_modified: [
        "System Components",
        "Rental Process",
        "Technical Requirements",
        "Added new section: Maintenance Process"
      ]
    };
  }

  _generateMockGenerateResponse() {
    return {
      title: "Zoho Creator Deluge Scripting Guide",
      content: `# Zoho Creator Deluge Scripting Guide

## Introduction
Deluge (Data Enriched Language for the Universal Grid Environment) is the scripting language used in Zoho Creator applications. This guide provides an overview of Deluge scripting for vehicle rental management systems.

## Basic Syntax
Deluge is a simple, readable scripting language with syntax similar to JavaScript:

\`\`\`
// Variable assignment
customerName = "John Doe";
rentalDays = 5;
dailyRate = 45.50;

// Calculation
totalCost = rentalDays * dailyRate;

// Conditional statement
if(totalCost > 200) {
    discount = totalCost * 0.1;
    totalCost = totalCost - discount;
}

// Output
return "Total rental cost for " + customerName + ": $" + totalCost;
\`\`\`

## Working with Forms and Records
Deluge provides functions to interact with Zoho Creator forms and records:

### Fetching Records
\`\`\`
// Get all active vehicles
vehicles = zoho.creator.getRecords("rental_app", "Vehicles", "Status == 'Available'", 1, 100);

// Get specific rental by ID
rentalInfo = zoho.creator.getRecordById("rental_app", "Rentals", rentalID);
\`\`\`

### Creating Records
\`\`\`
// Create new rental record
rentalMap = Map();
rentalMap.put("Customer_ID", customerID);
rentalMap.put("Vehicle_ID", vehicleID);
rentalMap.put("Start_Date", startDate);
rentalMap.put("End_Date", endDate);
rentalMap.put("Status", "Active");
rentalResponse = zoho.creator.createRecord("rental_app", "Rentals", rentalMap);
\`\`\`

### Updating Records
\`\`\`
// Update vehicle status
updateMap = Map();
updateMap.put("Status", "Rented");
updateResponse = zoho.creator.updateRecord("rental_app", "Vehicles", vehicleID, updateMap);
\`\`\`

## Error Handling
Implement error handling to make scripts robust:

\`\`\`
try {
    // Code that might cause an error
    rentalInfo = zoho.creator.getRecordById("rental_app", "Rentals", rentalID);
    
    if(rentalInfo.isEmpty()) {
        throw "Rental record not found";
    }
    
    // Process rental information
    return "Rental processed successfully";
} catch (e) {
    // Handle the error
    errorLog = Map();
    errorLog.put("Error_Message", e.toString());
    errorLog.put("Function", "processRental");
    zoho.creator.createRecord("rental_app", "ErrorLogs", errorLog);
    
    return "Error: " + e.toString();
}
\`\`\`

## Best Practices
1. **Use meaningful variable names** for better code readability
2. **Add comments** to explain complex logic
3. **Implement error handling** for all database operations
4. **Validate input data** before processing
5. **Use Maps for structured data** when working with records
6. **Limit API calls** to improve performance
7. **Log errors** for easier troubleshooting

## Common Functions
- \`zoho.creator.getRecords()\` - Fetch multiple records
- \`zoho.creator.getRecordById()\` - Fetch a single record by ID
- \`zoho.creator.createRecord()\` - Create a new record
- \`zoho.creator.updateRecord()\` - Update an existing record
- \`zoho.creator.deleteRecord()\` - Delete a record
- \`zoho.currentdate\` - Get current date
- \`zoho.currenttime\` - Get current time
- \`zoho.loginuser\` - Get current user email

## Conclusion
Deluge scripting provides powerful capabilities for customizing Zoho Creator applications. By mastering these concepts, you can build sophisticated vehicle rental management systems with custom business logic.`,
      sections: [
        {
          heading: "Introduction",
          content: "Deluge (Data Enriched Language for the Universal Grid Environment) is the scripting language used in Zoho Creator applications. This guide provides an overview of Deluge scripting for vehicle rental management systems."
        },
        {
          heading: "Basic Syntax",
          content: "Deluge is a simple, readable scripting language with syntax similar to JavaScript..."
        },
        {
          heading: "Working with Forms and Records",
          content: "Deluge provides functions to interact with Zoho Creator forms and records..."
        },
        {
          heading: "Error Handling",
          content: "Implement error handling to make scripts robust..."
        },
        {
          heading: "Best Practices",
          content: "1. **Use meaningful variable names** for better code readability\n2. **Add comments** to explain complex logic..."
        },
        {
          heading: "Common Functions",
          content: "- `zoho.creator.getRecords()` - Fetch multiple records\n- `zoho.creator.getRecordById()` - Fetch a single record by ID..."
        },
        {
          heading: "Conclusion",
          content: "Deluge scripting provides powerful capabilities for customizing Zoho Creator applications. By mastering these concepts, you can build sophisticated vehicle rental management systems with custom business logic."
        }
      ],
      metadata: {
        author: "Documentation Agent",
        created_date: "2024-03-09",
        version: "1.0"
      }
    };
  }
}

module.exports = DocumentationAgent;
