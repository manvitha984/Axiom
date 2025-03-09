import os
import base64
import json
import re  # For regular expressions (used for text processing)
import logging
import subprocess  # For running external commands (like Node.js scripts)
from pathlib import Path
import pickle  # For loading the model and vectorizer
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from nltk.corpus import stopwords  # For stop words (common words to ignore in text analysis)
from nltk.stem import WordNetLemmatizer  # For lemmatizing words

# Set up logging configuration to see debug/info messages in the terminal
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Load the frustration prediction model and TF-IDF vectorizer
# NOTE: In unit tests, these globals can be temporarily replaced with dummy objects.
with open(os.path.join('model', 'model.pkl'), 'rb') as f:  # Open the model file in binary read mode
    model = pickle.load(f)  # Load the model from the file using pickle
with open(os.path.join('model', 'tfidf.pkl'), 'rb') as f:  # Open the TF-IDF vectorizer file in binary read mode
    tfidf = pickle.load(f)  # Load the TF-IDF vectorizer from the file using pickle

# Define the required Gmail API scope
SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']

# ==================== Gmail API Setup ====================
def get_gmail_service():
    """
    Authenticates with Gmail and returns a Gmail API service object.
    This function handles the OAuth 2.0 flow to obtain credentials and build the Gmail service.
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

# ==================== Text Preprocessing ====================
def preprocess_text(text):
    """
    Preprocesses input text by removing HTML tags, URLs, non-alphabet characters,
    converting to lowercase, tokenizing, lemmatizing, and removing stopwords.
    """
    # Remove HTML tags, URLs, and non-alphabet characters
    text = re.sub(r'<.*?>|http\S+|[^a-zA-Z\s]', '', text)
    tokens = text.lower().split()
    lemmatizer = WordNetLemmatizer()
    tokens = [lemmatizer.lemmatize(word) for word in tokens if word not in stopwords.words('english')]
    return ' '.join(tokens)

# ==================== Custom Model Prediction ====================
def predict_frustration_custom(text):
    """
    Predicts the probability that the text is frustrated using a custom model.
    """
    try:
        cleaned_text = preprocess_text(text)
        # Transform the cleaned text using the TF-IDF vectorizer
        features = tfidf.transform([cleaned_text])
        # Predict the probability of the text being frustrated
        probability = model.predict_proba(features)[0][1]
        logger.debug(f"Custom model prediction: {probability:.3f}")
        return float(probability)
    except Exception as e:
        logger.error(f"Custom model error: {str(e)}")
        return 0.5

# ==================== Gemini Model Prediction ====================
def predict_frustration_gemini(text):
    """
    Predicts the probability that the text is frustrated using the Gemini model.
    This function calls a Node.js script (gemini_predict.js) and parses its JSON output.
    """
    try:
        script_path = Path(__file__).parent / 'gemini_predict.js'
        if not script_path.exists():
            logger.error(f"gemini_predict.js not found at {script_path}")
            return 0.5

        # Escape text for JSON safely
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

# ==================== Email Processing ====================
def summarize_emails_with_gemini(text):
    """
    Summarizes emails using the Gemini API via a Node.js script (gemini_email_summarize.js).
    """
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
    results = service.users().messages().list(userId='me', q='is:unread', maxResults=4).execute()
    messages = results.get('messages', [])
    processed_emails = []

    for msg in messages:
        msg_data = service.users().messages().get(userId='me', id=msg['id']).execute()
        headers = msg_data.get('payload', {}).get('headers', [])
        subject = next((h['value'] for h in headers if h['name'] == 'Subject'), '')
        from_email = next((h['value'] for h in headers if h['name'] == 'From'), '')
        date = next((h['value'] for h in headers if h['name'] == 'Date'), '')
        body = ''

        # Check if the email has parts; if not, process the plain body.
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
        final_score = (0.4 * score_custom) + (0.6 * score_gemini)

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


# ==================== Unit Tests ====================
import unittest
from unittest.mock import patch, MagicMock

class TestEmailClassifier(unittest.TestCase):
    def test_preprocess_text(self):
        """
        Test that HTML tags, URLs, non-alphabetic characters are removed,
        and that stopwords are filtered and words are lemmatized.
        """
        input_text = "<p>This is a test email! Check out http://example.com. Running tests?</p>"
        # Expected processing:
        # After regex and lowering: "this is a test email check out  running tests"
        # After removing stopwords (e.g., this, is, a, out) and lemmatizing:
        # Expected tokens might be: ["test", "email", "check", "running", "test"]
        expected = "test email check running test"
        processed = preprocess_text(input_text)
        self.assertEqual(processed, expected)

    def test_predict_frustration_custom(self):
        """
        Test the custom prediction function using dummy model and tfidf transformer.
        """
        # Define dummy objects for the model and tfidf vectorizer.
        class DummyModel:
            def predict_proba(self, features):
                return [[0.3, 0.7]]
        class DummyTfidf:
            def transform(self, texts):
                # Return dummy features (the actual content is not used)
                return texts

        global model, tfidf
        original_model = model
        original_tfidf = tfidf
        try:
            model = DummyModel()
            tfidf = DummyTfidf()
            # Since dummy returns 0.7 for frustrated probability, we expect that.
            result = predict_frustration_custom("Dummy text")
            self.assertAlmostEqual(result, 0.7)
        finally:
            # Restore the original objects
            model = original_model
            tfidf = original_tfidf

    @patch('subprocess.check_output')
    def test_predict_frustration_gemini(self, mock_check_output):
        """
        Test Gemini prediction by patching subprocess.check_output to return a dummy JSON string.
        """
        # Simulate node script output containing JSON data.
        dummy_output = '{"confidence": 0.8}'
        mock_check_output.return_value = dummy_output
        # Also, patch Path.exists to always return True for the script.
        with patch.object(Path, "exists", return_value=True):
            result = predict_frustration_gemini("Dummy text")
            self.assertAlmostEqual(result, 0.8)

    @patch('subprocess.check_output')
    def test_summarize_emails_with_gemini(self, mock_check_output):
        """
        Test email summarization using Gemini by patching subprocess.check_output.
        """
        dummy_summary = {"summary": "Test summary generated."}
        mock_check_output.return_value = json.dumps(dummy_summary)
        with patch.object(Path, "exists", return_value=True):
            summary = summarize_emails_with_gemini("Some long text")
            self.assertEqual(summary, "Test summary generated.")

    def test_summarize_frustration_reasons(self):
        """
        Test the summary generation function when frustrated emails are present.
        """
        emails = [
            {'body': 'First frustrated email body', 'is_frustrated': True},
            {'body': 'Non-frustrated email body', 'is_frustrated': False},
            {'body': 'Second frustrated email body', 'is_frustrated': True},
        ]
        # Patch the Gemini summarization function to return a fake summary.
        with patch('__main__.summarize_emails_with_gemini', return_value="Fake summary"):
            summary = summarize_frustration_reasons(emails)
            self.assertEqual(summary, "Fake summary")

    @patch('__main__.summarize_emails_with_gemini', return_value="Fake summary")
    @patch('__main__.predict_frustration_gemini', return_value=0.6)
    @patch('__main__.predict_frustration_custom', return_value=0.6)
    @patch('__main__.get_gmail_service')
    def test_fetch_and_classify_emails(self, mock_get_service, mock_custom, mock_gemini, mock_summarize):
        """
        Test fetching and classifying emails by simulating the Gmail API responses.
        """
        # Create a fake Gmail service with chained method calls.
        fake_service = MagicMock()
        # Fake list result with one message
        fake_list_result = {'messages': [{'id': '1'}]}
        fake_service.users.return_value.messages.return_value.list.return_value.execute.return_value = fake_list_result

        # Create fake email message data.
        fake_message_data = {
            'id': '1',
            'payload': {
                'headers': [
                    {'name': 'Subject', 'value': 'Test Subject'},
                    {'name': 'From', 'value': 'sender@example.com'},
                    {'name': 'Date', 'value': 'Mon, 01 Jan 2020 00:00:00 +0000'},
                ],
                # Provide body data as base64-encoded text
                'body': {'data': base64.urlsafe_b64encode("Test email body".encode('utf-8')).decode('utf-8')}
            }
        }
        fake_service.users.return_value.messages.return_value.get.return_value.execute.return_value = fake_message_data

        mock_get_service.return_value = fake_service

        processed_emails, summary = fetch_and_classify_emails()
        # Check that one email is processed and that the classification is as expected.
        self.assertEqual(len(processed_emails), 1)
        self.assertTrue(processed_emails[0]['is_frustrated'])
        self.assertEqual(summary, "Fake summary")


# ==================== Main Execution ====================
if __name__ == '__main__':
    import sys
    # If "test" is passed as a command-line argument, run unit tests.
    if len(sys.argv) > 1 and sys.argv[1] == "test":
        # Remove the test argument before running unittest
        sys.argv.pop(1)
        unittest.main()
    else:
        try:
            emails, summary = fetch_and_classify_emails()
            print("Processed Emails:")
            for email in emails:
                print(email)
            print("\nSummary of Frustration Reasons:")
            print(summary)
        except Exception as e:
            logger.error(f"Error running main functionality: {str(e)}")
