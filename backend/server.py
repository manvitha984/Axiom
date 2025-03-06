import os
import camelot
import pandas as pd
import io
import base64
from flask import Flask, request, jsonify, send_file, render_template
from werkzeug.utils import secure_filename
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
from flask_cors import CORS, cross_origin
import pickle
import re
import nltk
import subprocess
import json
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
import tempfile
import logging
import time
from pathlib import Path
import av
import numpy as np
import soundfile as sf
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
import librosa
from PyPDF2 import PdfReader
# Add this near your other imports
from googletrans import Translator
from email_processor import fetch_and_classify_emails
from video_summarizer import video_summarizer_bp, generate_summary_pdf

# Other imports related to email features, translations, etc.
from email_processor import fetch_and_classify_emails

try:
    import whisper
except ImportError as e:
    logging.error(f"Failed to import whisper: {e}")
    raise

nltk.download('stopwords')
nltk.download('wordnet')

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)
# Enable CORS for all routes and allow all origins
CORS(app, resources={r"/*": {"origins": "*"}})
app.register_blueprint(video_summarizer_bp)
app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(__file__), 'uploads')
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
@app.route('/translate_summary', methods=['POST'])
@cross_origin()
def translate_summary():
    """
    Example route for translating summary text, then generating a PDF.
    """
    try:
        data = request.get_json()
        original_text = data.get('text', '')
        target_language = data.get('language', 'en')

        if not original_text:
            return jsonify({"error": "No text provided"}), 400

        translator = Translator()
        translated = translator.translate(original_text, dest=target_language)
        translated_text = translated.text

        # Use the generate_summary_pdf function from video_summarizer
        pdf_path = generate_summary_pdf(translated_text, f"Video Summary ({target_language.upper()})")

        return send_file(
            pdf_path,
            as_attachment=True,
            download_name=f"video_summary_{target_language}.pdf",
            mimetype="application/pdf"
        )
    except Exception as e:
        logger.error(f"Error translating summary: {str(e)}")
        return jsonify({"error": f"Translation failed: {str(e)}"}), 500


@app.route('/fetch_predicted_emails', methods=['GET'])
@cross_origin()
def fetch_predicted_emails():
    try:
        emails, frustration_summary = fetch_and_classify_emails()
        return jsonify({
            'emails': emails,
            'frustration_summary': frustration_summary
        })
    except Exception as e:
        logger.error(f"Error processing emails: {str(e)}")
        return jsonify({"error": str(e)}), 500
    
# ---------------------------
# Invoice Data Extraction Feature
# ---------------------------
SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']


def get_gmail_service():
    """
    Authenticates with Gmail and returns a Gmail API service object.
    Uses token.json to avoid repeated permission prompts.
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
                # Try loading credentials.json; raise a clear error if missing
                creds = InstalledAppFlow.from_client_secrets_file('credentials.json', SCOPES).run_local_server(port=8080)
        except FileNotFoundError as fnf_error:
            logger.error("credentials.json file not found. Please add it to the backend folder.")
            raise RuntimeError("credentials.json file not found. Please add it to the backend folder.") from fnf_error
        with open(token_path, 'w') as token:
            token.write(creds.to_json())
    service = build('gmail', 'v1', credentials=creds)
    return service


def extract_first_and_last_names(pdf_path, output_excel_path):
    tables = camelot.read_pdf(pdf_path, pages='1', flavor='stream')
    df = tables[0].df
    df.columns = df.iloc[0]
    df = df.drop(df.index[0]).reset_index(drop=True)
    df = df.rename(columns={
        'First Name': 'first_name',
        'Last Name': 'last_name'
    })
    filtered_df = df[['first_name', 'last_name']]
    filtered_df.to_excel(output_excel_path, index=False)


def fetch_pdfs_from_invoices():
    service = get_gmail_service()
    results = service.users().messages().list(
        userId='me', q="subject:invoice has:attachment", maxResults=2
    ).execute()
    messages = results.get('messages', [])
    pdf_paths = []
    subjects = []

    for msg in messages:
        msg_data = service.users().messages().get(userId='me', id=msg['id']).execute()
        subject_line = "(No Subject)"
        headers = msg_data.get('payload', {}).get('headers', [])
        for header in headers:
            if header['name'].lower() == 'subject':
                subject_line = header['value']
                break
        subjects.append(subject_line)

        parts = msg_data.get('payload', {}).get('parts', [])
        for part in parts:
            if part.get('filename') and part['filename'].lower().endswith('.pdf'):
                att_id = part['body'].get('attachmentId')
                if att_id:
                    attachment = service.users().messages().attachments() \
                        .get(userId='me', messageId=msg['id'], id=att_id).execute()
                    file_data = attachment.get('data')
                    if file_data:
                        file_data = file_data.replace('-', '+').replace('_', '/')
                        file_bytes = io.BytesIO(base64.b64decode(file_data))
                        local_path = os.path.join(app.config['UPLOAD_FOLDER'], part['filename'])
                        with open(local_path, 'wb') as f:
                            f.write(file_bytes.getbuffer())
                        pdf_paths.append(local_path)
    return pdf_paths, subjects



@app.route('/extract_invoice_data', methods=['POST'])
@cross_origin()
def extract_invoice_data():
    action = request.form.get('action')
    if action == 'upload':
        file = request.files['file']
        if file:
            filename = secure_filename(file.filename)
            local_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(local_path)
            output_excel = 'extracted_names.xlsx'
            extract_first_and_last_names(local_path, output_excel)
            return send_file(
                output_excel,
                as_attachment=True,
                download_name="extracted_names.xlsx",
                mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            )
    elif action == 'read_emails':
        pdf_files, subjects = fetch_pdfs_from_invoices()
        logger.info(f"Email subjects found: {subjects}")
        if not pdf_files:
            return "<div style='padding: 20px; font-size: 1.2rem;'>No mails found with the subject having invoice.</div>"
        # For demonstration, process the first PDF retrieved.
        local_pdf = pdf_files[0]
        output_excel = 'extracted_names.xlsx'
        extract_first_and_last_names(local_pdf, output_excel)
        return send_file(
            output_excel,
            as_attachment=True,
            download_name="extracted_names.xlsx",
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
    return "Invalid action", 400

@app.route('/api/gemini-chat', methods=['POST'])
def gemini_chat():
    data = request.get_json()
    message = data.get('message', '')

    if not message:
        return jsonify({'reply': 'No message provided'}), 400

    try:
        script_path = Path(__file__).parent / 'gemini_chatbot.js'
        if not script_path.exists():
            return jsonify({'reply': 'Gemini script not found'}), 500

        result = subprocess.check_output(
            ["node", str(script_path), message],
            stderr=subprocess.STDOUT,
            universal_newlines=True,
            timeout=30
        )

        reply = result.strip()
        return jsonify({'reply': reply})

    except subprocess.TimeoutExpired:
        return jsonify({'reply': 'Gemini API call timed out'}), 500
    except subprocess.CalledProcessError as e:
        return jsonify({'reply': f'Error calling gemini_chatbot.js: {e.output}'}), 500
    except Exception as e:
        return jsonify({'reply': f'Unexpected error: {str(e)}'}), 500
    
    
if __name__ == '__main__':
    app.run(port=5000, debug=True, use_reloader=False)



