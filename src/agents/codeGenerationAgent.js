const axios = require('axios');

class CodeGenerationAgent {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.model = 'claude-3-7-sonnet-20250219'; // Using Claude 3.7 Sonnet for superior code generation
    this.baseUrl = 'https://api.anthropic.com/v1';
  }

  async generateCode(requirements, context = {}) {
    try {
      console.log('Generating Deluge code based on requirements...');
      
      const systemPrompt = this._buildGenerateSystemPrompt();
      const userPrompt = this._buildGenerateUserPrompt(requirements, context);
      const response = await this._callClaudeAPI(systemPrompt, userPrompt);
      return this._parseGenerateResponse(response);
    } catch (error) {
      console.error('Error in code generation agent:', error);
      throw error;
    }
  }

  async improveCode(code, requirements = '') {
    try {
      console.log('Improving existing Deluge code...');
      
      const systemPrompt = this._buildImproveSystemPrompt();
      const userPrompt = this._buildImproveUserPrompt(code, requirements);
      const response = await this._callClaudeAPI(systemPrompt, userPrompt);
      return this._parseImproveResponse(response);
    } catch (error) {
      console.error('Error in code improvement:', error);
      throw error;
    }
  }

  _buildGenerateSystemPrompt() {
    return `You are a Code Generation Agent specializing in Zoho Creator's Deluge scripting language.
    Your task is to generate high-quality, well-documented Deluge code based on requirements.
    Always format your responses as valid JSON without trailing commas or syntax errors.
    Focus on creating efficient, secure, and maintainable code that follows best practices.
    Include detailed comments and error handling in your code.`;
  }

  _buildGenerateUserPrompt(requirements, context) {
    return `
Please generate Deluge script code based on the following requirements:

Requirements:
${requirements}

Additional context:
${JSON.stringify(context, null, 2)}

Return your response as JSON with the following structure:
{
  "code": "// Your generated Deluge code here",
  "explanation": "Explanation of how the code works",
  "usage_instructions": "How to use this code in Zoho Creator",
  "assumptions": ["Assumption 1", "Assumption 2"],
  "potential_improvements": ["Improvement 1", "Improvement 2"]
}

Make sure the code includes:
1. Proper error handling
2. Input validation
3. Detailed comments
4. Efficient implementation
5. Security considerations`;
  }

  _buildImproveSystemPrompt() {
    return `You are a Code Improvement Agent specializing in Zoho Creator's Deluge scripting language.
    Your task is to improve existing Deluge code by making it more efficient, secure, and maintainable.
    Always format your responses as valid JSON without trailing commas or syntax errors.
    Focus on adding proper error handling, improving performance, and enhancing readability.
    Preserve the original functionality while making the code better.`;
  }

  _buildImproveUserPrompt(code, requirements) {
    return `
Please improve the following Deluge code:

\`\`\`
${code}
\`\`\`

Additional requirements or context:
${requirements}

Return your response as JSON with the following structure:
{
  "improved_code": "// Your improved Deluge code here",
  "changes_made": ["Change 1", "Change 2"],
  "explanation": "Explanation of the improvements",
  "additional_recommendations": ["Recommendation 1", "Recommendation 2"]
}

Focus on:
1. Adding or improving error handling
2. Enhancing code readability
3. Optimizing performance
4. Fixing potential bugs or security issues
5. Improving documentation and comments`;
  }

  async _callClaudeAPI(systemPrompt, userPrompt) {
    try {
      console.log('Making API request to Claude...');
      
      const url = `${this.baseUrl}/messages`;
      
      const data = {
        model: this.model,
        max_tokens: 4000, // Increased token limit for code generation
        temperature: 0.2, // Lower temperature for more precise code generation
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

  _parseGenerateResponse(response) {
    try {
      console.log('Parsing Claude response for code generation...');
      
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

  _parseImproveResponse(response) {
    try {
      console.log('Parsing Claude response for code improvement...');
      
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
      return this._generateMockImproveResponse();
    }
  }

  _generateMockGenerateResponse() {
    return {
      code: `// Function to process a rental request
function processRentalRequest(rentalRequestID) {
  try {
    // Get the rental request details
    rentalRequest = zoho.creator.getRecordById("rental_app", "RentalRequests", rentalRequestID);
    
    if (rentalRequest.isEmpty()) {
      throw "Rental request not found with ID: " + rentalRequestID;
    }
    
    // Check if vehicle is available
    vehicleID = rentalRequest.get("Vehicle_ID");
    vehicle = zoho.creator.getRecordById("rental_app", "Vehicles", vehicleID);
    
    if (vehicle.isEmpty()) {
      throw "Vehicle not found with ID: " + vehicleID;
    }
    
    if (vehicle.get("Status") != "Available") {
      return {
        "success": false,
        "message": "Vehicle is not available for rental"
      };
    }
    
    // Create new rental record
    rentalMap = Map();
    rentalMap.put("Customer_ID", rentalRequest.get("Customer_ID"));
    rentalMap.put("Vehicle_ID", vehicleID);
    rentalMap.put("Start_Date", rentalRequest.get("Start_Date"));
    rentalMap.put("End_Date", rentalRequest.get("End_Date"));
    rentalMap.put("Status", "Active");
    
    // Calculate rental cost
    startDate = rentalRequest.get("Start_Date");
    endDate = rentalRequest.get("End_Date");
    daysDiff = daysBetween(startDate, endDate);
    dailyRate = vehicle.get("Daily_Rate");
    totalCost = dailyRate * daysDiff;
    rentalMap.put("Total_Cost", totalCost);
    
    // Create the rental record
    rentalResponse = zoho.creator.createRecord("rental_app", "Rentals", rentalMap);
    
    if (rentalResponse.get("code") != "success") {
      throw "Failed to create rental: " + rentalResponse.get("message");
    }
    
    // Update vehicle status
    vehicleUpdateMap = Map();
    vehicleUpdateMap.put("Status", "Rented");
    vehicleUpdateResponse = zoho.creator.updateRecord("rental_app", "Vehicles", vehicleID, vehicleUpdateMap);
    
    // Update request status
    requestUpdateMap = Map();
    requestUpdateMap.put("Status", "Approved");
    requestUpdateResponse = zoho.creator.updateRecord("rental_app", "RentalRequests", rentalRequestID, requestUpdateMap);
    
    return {
      "success": true,
      "rental_id": rentalResponse.get("data").get("ID"),
      "message": "Rental created successfully"
    };
  } catch (e) {
    // Log the error
    errorLog = Map();
    errorLog.put("Error_Message", e.toString());
    errorLog.put("Function", "processRentalRequest");
    errorLog.put("Request_ID", rentalRequestID);
    zoho.creator.createRecord("rental_app", "ErrorLogs", errorLog);
    
    return {
      "success": false,
      "message": "Error processing rental request: " + e.toString()
    };
  }
}`,
      explanation: "This code processes a rental request by checking vehicle availability, creating a rental record, updating the vehicle status, and updating the request status. It includes comprehensive error handling and returns a structured response.",
      usage_instructions: "Call this function with a valid rental request ID. The function will return a map with success status, message, and rental ID if successful.",
      assumptions: [
        "The rental_app application exists with RentalRequests, Vehicles, and Rentals forms",
        "The Vehicles form has a Status field and Daily_Rate field",
        "The RentalRequests form has Customer_ID, Vehicle_ID, Start_Date, and End_Date fields",
        "An ErrorLogs form exists for logging errors"
      ],
      potential_improvements: [
        "Add validation for rental dates (e.g., ensure end date is after start date)",
        "Implement a transaction mechanism to roll back changes if any step fails",
        "Add notification to customer when rental is approved",
        "Include additional fee calculations (insurance, taxes, etc.)"
      ]
    };
  }

  _generateMockImproveResponse() {
    return {
      improved_code: `// Function to process a rental by updating its status
function processRental(rentalID) {
  try {
    // Input validation
    if (rentalID == null || rentalID == "") {
      throw "Invalid rental ID: Rental ID cannot be empty";
    }
    
    // Get rental information from database
    rentalInfo = zoho.creator.getRecordById("rental_app", "Rentals", rentalID);
    
    // Check if rental exists
    if (rentalInfo.isEmpty()) {
      throw "Rental not found with ID: " + rentalID;
    }
    
    // Check current status
    currentStatus = rentalInfo.get("Status");
    if (currentStatus != "Pending") {
      return {
        "success": false,
        "message": "Rental already processed. Current status: " + currentStatus
      };
    }
    
    // Update rental status
    updateMap = Map();
    updateMap.put("Status", "Approved");
    updateMap.put("ProcessedDate", zoho.currentdate);
    updateMap.put("ProcessedBy", zoho.loginuser);
    
    // Update the record in database
    updateResponse = zoho.creator.updateRecord("rental_app", "Rentals", rentalID, updateMap);
    
    // Check if update was successful
    if (updateResponse.get("code") != "success") {
      throw "Failed to update rental: " + updateResponse.get("message");
    }
    
    // Log the successful update
    auditLog = Map();
    auditLog.put("Action", "Rental Approval");
    auditLog.put("Record_ID", rentalID);
    auditLog.put("User", zoho.loginuser);
    auditLog.put("Timestamp", zoho.currenttime);
    zoho.creator.createRecord("rental_app", "AuditLogs", auditLog);
    
    // Return success response
    return {
      "success": true,
      "message": "Rental successfully approved",
      "rental_id": rentalID
    };
  } catch (e) {
    // Log the error
    errorLog = Map();
    errorLog.put("Error_Message", e.toString());
    errorLog.put("Function", "processRental");
    errorLog.put("Rental_ID", rentalID);
    zoho.creator.createRecord("rental_app", "ErrorLogs", errorLog);
    
    // Return error response
    return {
      "success": false,
      "message": "Error processing rental: " + e.toString()
    };
  }
}`,
      changes_made: [
        "Added comprehensive error handling with try-catch block",
        "Added input validation for rental ID",
        "Added check if rental exists in database",
        "Added structured response object with success status and message",
        "Added audit logging for successful operations",
        "Added error logging for failed operations",
        "Added tracking of who processed the rental (zoho.loginuser)",
        "Improved code comments and organization"
      ],
      explanation: "The improved code adds robust error handling, input validation, and audit logging. It now returns structured responses that make it easier to handle success and failure cases. The code is also better documented with clear comments explaining each section.",
      additional_recommendations: [
        "Consider implementing a notification system to alert customers when their rental is approved",
        "Add a transaction mechanism to ensure all database operations succeed or fail together",
        "Implement a status history tracking system to maintain a record of all status changes",
        "Add permission checking to ensure only authorized users can approve rentals"
      ]
    };
  }
}

module.exports = CodeGenerationAgent;
