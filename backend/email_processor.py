import os
import base64
import json
import re
import logging
import subprocess
from pathlib import Path
import pickle
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer

# Set up logging configuration to see debug/info messages in the terminal
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Load the frustration prediction model and TF-IDF vectorizer
with open(os.path.join('model', 'model.pkl'), 'rb') as f:
    model = pickle.load(f)
with open(os.path.join('model', 'tfidf.pkl'), 'rb') as f:
    tfidf = pickle.load(f)

SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']

def get_gmail_service():
    """
    Authenticates with Gmail and returns a Gmail API service object.
    """
    token_path = 'token.json'
    creds = InstalledAppFlow.from_client_secrets_file('credentials.json', SCOPES).run_local_server(port=8081)
    if os.path.exists(token_path):
        from google.oauth2.credentials import Credentials
        creds = Credentials.from_authorized_user_file(token_path, SCOPES)
    if not creds or not creds.valid:
        from google.auth.transport.requests import Request
        try:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                creds = InstalledAppFlow.from_client_secrets_file('credentials.json', SCOPES).run_local_server(port=8080)
        except Exception as e:
            logger.error("Error obtaining credentials", exc_info=True)
            raise
        with open(token_path, 'w') as token:
            token.write(creds.to_json())
    service = build('gmail', 'v1', credentials=creds)
    return service

def preprocess_text(text):
    text = re.sub(r'<.*?>|http\S+|[^a-zA-Z\s]', '', text)
    tokens = text.lower().split()
    lemmatizer = WordNetLemmatizer()
    tokens = [lemmatizer.lemmatize(word) for word in tokens if word not in stopwords.words('english')]
    return ' '.join(tokens)

def predict_frustration_custom(text):
    try:
        cleaned_text = preprocess_text(text)
        features = tfidf.transform([cleaned_text])
        probability = model.predict_proba(features)[0][1]
        logger.debug(f"Custom model prediction: {probability:.3f}")
        return float(probability)
    except Exception as e:
        logger.error(f"Custom model error: {str(e)}")
        return 0.5

def predict_frustration_gemini(text):
    try:
        script_path = Path(__file__).parent / 'gemini_predict.js'
        if not script_path.exists():
            logger.error(f"gemini_predict.js not found at {script_path}")
            return 0.5
        escaped_text = json.dumps(text)
        result = subprocess.check_output(
            ["node", str(script_path), escaped_text],
            stderr=subprocess.STDOUT,
            universal_newlines=True,
            timeout=30
        )
        # Extract the JSON substring from the result using a regex
        match = re.search(r'({.*})', result)
        if match:
            parsed = json.loads(match.group(1))
            confidence = float(parsed.get("confidence", 0.5))
            logger.debug(f"Gemini model prediction: {confidence:.3f}")
            return confidence
        else:
            logger.error("No valid JSON found in Gemini response")
            return 0.5
    except Exception as e:
        logger.error(f"Gemini prediction error: {str(e)}")
        return 0.5

def summarize_emails_with_gemini(text):
    try:
        script_path = Path(__file__).parent / 'gemini_email_summarize.js'
        if not script_path.exists():
            logger.error(f"gemini_email_summarize.js not found at {script_path}")
            return "Summary generation failed - missing script"
        escaped_text = json.dumps(text)
        result = subprocess.check_output(
            ["node", str(script_path), escaped_text],
            stderr=subprocess.STDOUT,
            universal_newlines=True,
            timeout=60
        )
        try:
            response = json.loads(result)
            if 'error' in response:
                logger.error(f"Gemini summary error: {response['error']}")
                return f"Summary error: {response['error']}"
            return response.get('summary', 'No summary generated')
        except json.JSONDecodeError:
            logger.error(f"Invalid JSON response: {result}")
            return "Summary error: Invalid API response"
    except Exception as e:
        logger.error(f"Error in summarize_emails_with_gemini: {str(e)}")
        return f"Summary error: {str(e)}"

def summarize_frustration_reasons(emails):
    """
    Given a list of email dictionaries, generate a summary of the reasons for frustration.
    """
    frustrated_emails = [email['body'] for email in emails if email['is_frustrated']]
    if not frustrated_emails:
        return "No frustrated emails found."
    combined_text = "\n".join(frustrated_emails)
    # Limit the text to avoid exceeding token limits
    max_length = 10000 
    if len(combined_text) > max_length:
        combined_text = combined_text[:max_length]
        logger.warning(f"Truncated combined text to {max_length} characters.")
    summary = summarize_emails_with_gemini(combined_text)
    return summary

def fetch_and_classify_emails():
    """
    Retrieves unread emails, classifies each as frustrated or not using both custom and Gemini predictions,
    and then generates a summary for the frustrated emails.
    Returns a tuple of (processed_emails, frustration_summary).
    """
    service = get_gmail_service()
    results = service.users().messages().list(userId='me', q='is:unread', maxResults=2).execute()
    messages = results.get('messages', [])
    processed_emails = []

    for msg in messages:
        msg_data = service.users().messages().get(userId='me', id=msg['id']).execute()
        headers = msg_data.get('payload', {}).get('headers', [])
        subject = next((h['value'] for h in headers if h['name'] == 'Subject'), '')
        from_email = next((h['value'] for h in headers if h['name'] == 'From'), '')
        date = next((h['value'] for h in headers if h['name'] == 'Date'), '')
        body = ''

        if 'parts' in msg_data.get('payload', {}):
            for part in msg_data['payload']['parts']:
                if part['mimeType'] == 'text/plain':
                    body = base64.urlsafe_b64decode(part['body']['data']).decode('utf-8')
        else:
            body_data = msg_data['payload']['body'].get('data', '')
            if body_data:
                body = base64.urlsafe_b64decode(body_data).decode('utf-8')

        score_custom = predict_frustration_custom(body)
        score_gemini = predict_frustration_gemini(body)
        final_score = (0.6 * score_custom) + (0.4 * score_gemini)

        # Log the scores for each email in the terminal
        logger.info(f"Email ID {msg['id']} - Custom Score: {score_custom:.3f}, Gemini Score: {score_gemini:.3f}, Combined Score: {final_score:.3f}")

        email_data = {
            'id': msg['id'],
            'from': from_email,
            'subject': subject,
            'date': date,
            'body': body,
            'score_custom': float(score_custom),
            'score_gemini': float(score_gemini),
            'combined_score': float(final_score),
            'is_frustrated': final_score > 0.5
        }
        processed_emails.append(email_data)

    summary = summarize_frustration_reasons(processed_emails)
    return processed_emails, summary
