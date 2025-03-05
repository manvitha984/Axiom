// filepath: /c:/Users/manvi/Desktop/axiom-project/axiom-main/front/src/services/emailService.js
import { gapi } from 'gapi-script';

const CLIENT_ID = import.meta.env.VITE_CLIENT_ID;
const API_KEY = import.meta.env.VITE_API_KEY;
const SCOPES = 'https://www.googleapis.com/auth/gmail.readonly';

const initClient = () => {
  return new Promise((resolve, reject) => {
    gapi.load('client:auth2', () => {
      gapi.client
        .init({
          apiKey: API_KEY,
          clientId: CLIENT_ID,
          discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest'],
          scope: SCOPES,
          ux_mode: 'popup'
        })
        .then(() => {
          const GoogleAuth = gapi.auth2.getAuthInstance();
          // Instead of signing out first, force consent by using the consent and select_account prompts
          return GoogleAuth.signIn({ prompt: 'consent select_account' });
        })
        .then(resolve)
        .catch(reject);
    });
  });
};
const getEmailContent = async (maxResults = 20) => {
  try {
    const response = await gapi.client.gmail.users.messages.list({
      userId: 'me',
      maxResults,
      labelIds: ['INBOX'],
    });
    console.log("Gmail messages list response:", response);
    const messages = response.result.messages || [];
    console.log("Messages found:", messages);
    
    const emails = await Promise.all(
      messages.map(async (message) => {
        try {
          const msg = await gapi.client.gmail.users.messages.get({
            userId: 'me',
            id: message.id,
            format: 'full',
          });
          console.log(`Message detail for ${message.id}:`, msg);
          const emailData = {};
          const headers = msg.result.payload.headers;
          headers.forEach((header) => {
            if (header.name === 'Subject') emailData.subject = header.value;
            if (header.name === 'From') emailData.from = header.value;
            if (header.name === 'Date') emailData.date = header.value;
          });
          
          let emailBody = "";
          if (msg.result.payload.parts) {
            msg.result.payload.parts.forEach((part) => {
              if (part.mimeType === 'text/plain' && part.body && part.body.data) {
                emailBody += atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
              }
            });
          } else if (msg.result.payload.body && msg.result.payload.body.data) {
            emailBody = atob(msg.result.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
          }
          emailData.body = emailBody;
          
          return emailData;
        } catch (err) {
          console.error(`Error processing message ${message.id}:`, err);
          return null;
        }
      })
    );
    return emails.filter(email => email !== null);
  } catch (error) {
    console.error('Error fetching email content:', error);
    return [];
  }
};
export const fetchIncomingEmails = async () => {
  try {
      console.log("Fetching emails...");
      // Ensure initialization happens only once.
      await initClient();
      const response = await fetch('http://localhost:5000/fetch_predicted_emails');

      if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Retrieved emails:", data.emails);

      if (!Array.isArray(data.emails)) {
          throw new Error("Invalid response format: expected array of emails");
      }

      return {
          emails: data.emails,
          frustrationSummary: data.frustration_summary
      };

  } catch (error) {
      console.error("Error fetching emails:", error);
      throw error;
  }
};