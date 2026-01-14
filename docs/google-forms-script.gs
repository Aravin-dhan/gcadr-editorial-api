/**
 * GCADR Blog - Google Forms Webhook Script
 * 
 * This Apps Script sends form submissions to the GCADR Editorial API.
 * 
 * SETUP INSTRUCTIONS:
 * 1. Open your Google Form in edit mode
 * 2. Click the three dots menu → Script editor
 * 3. Delete any existing code and paste this entire file
 * 4. Update the API_URL below with your Vercel deployment URL
 * 5. Save the script (Ctrl+S)
 * 6. Go to Triggers (clock icon on left) → Add Trigger
 * 7. Set: onFormSubmit | From form | On form submit
 * 8. Authorize the script when prompted
 * 
 * REQUIRED FORM FIELDS (exact question titles):
 * - "Article Title"
 * - "Author Name" or "Full Name"
 * - "Email Address" or "Email"
 * - "Abstract"
 * - "Google Drive Link" or "Document URL"
 * 
 * OPTIONAL FIELDS:
 * - "Affiliation" or "Institution/University"
 * - "Category"
 * - "Keywords"
 */

// UPDATE THIS URL after deploying to Vercel
const API_URL = 'https://gcadr-editorial-api.vercel.app/api/webhooks/google-form';

/**
 * Triggered when a form response is submitted
 */
function onFormSubmit(e) {
  try {
    const formResponse = e.response;
    const itemResponses = formResponse.getItemResponses();
    
    // Build form data object
    const formData = {};
    
    itemResponses.forEach(function(itemResponse) {
      const title = itemResponse.getItem().getTitle();
      const response = itemResponse.getResponse();
      formData[title] = response;
    });
    
    // Add metadata
    formData.timestamp = formResponse.getTimestamp().toISOString();
    formData.responseId = formResponse.getId();
    formData.formId = e.source.getId();
    
    // Send to API
    const payload = {
      formData: formData
    };
    
    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(API_URL, options);
    const responseCode = response.getResponseCode();
    const responseBody = response.getContentText();
    
    // Log result
    console.log('API Response (' + responseCode + '): ' + responseBody);
    
    if (responseCode !== 201 && responseCode !== 200) {
      // Send error notification to admin
      sendErrorNotification(formData, responseCode, responseBody);
    }
    
  } catch (error) {
    console.error('Error in onFormSubmit: ' + error.toString());
    sendErrorNotification({}, 0, error.toString());
  }
}

/**
 * Send email notification on error (optional)
 */
function sendErrorNotification(formData, statusCode, errorMessage) {
  const adminEmail = 'blog@gcadr.in'; // Update with your admin email
  
  const subject = '[GCADR Blog] Form Submission Error';
  const body = 'There was an error processing a form submission.\n\n' +
               'Status Code: ' + statusCode + '\n' +
               'Error: ' + errorMessage + '\n\n' +
               'Form Data:\n' + JSON.stringify(formData, null, 2);
  
  try {
    MailApp.sendEmail(adminEmail, subject, body);
  } catch (e) {
    console.error('Failed to send error notification: ' + e.toString());
  }
}

/**
 * Test function - run this manually to verify setup
 */
function testWebhook() {
  const testData = {
    formData: {
      'Article Title': 'Test Article Submission',
      'Author Name': 'Test Author',
      'Email Address': 'test@example.com',
      'Abstract': 'This is a test abstract for verifying the webhook connection.',
      'Google Drive Link': 'https://docs.google.com/document/d/test',
      'Category': 'Arbitration',
      'Affiliation': 'Test University',
      timestamp: new Date().toISOString(),
      responseId: 'test-' + Date.now()
    }
  };
  
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(testData),
    muteHttpExceptions: true
  };
  
  const response = UrlFetchApp.fetch(API_URL, options);
  console.log('Test Response (' + response.getResponseCode() + '): ' + response.getContentText());
}

/**
 * Manual function to process missed submissions
 * Run this if webhooks failed and you need to reprocess
 */
function processRecentResponses() {
  const form = FormApp.getActiveForm();
  const responses = form.getResponses();
  
  // Process last 5 responses
  const recentResponses = responses.slice(-5);
  
  recentResponses.forEach(function(formResponse) {
    const e = { response: formResponse, source: form };
    onFormSubmit(e);
    Utilities.sleep(1000); // Wait 1 second between submissions
  });
  
  console.log('Processed ' + recentResponses.length + ' responses');
}
