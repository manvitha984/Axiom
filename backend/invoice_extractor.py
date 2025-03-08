import os
import io
import sys
import base64
import camelot
import logging
import json
from pathlib import Path
from flask import Flask, Blueprint, request, jsonify, send_file, current_app
from flask_cors import cross_origin
from werkzeug.utils import secure_filename

# Google API imports
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from google.auth.transport.requests import Request

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Gmail API scope
SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']

# Global cache for storing PDFs fetched from emails
pdf_cache = {
    'pdfs': [],    # Each item is a dict with keys: 'filename', 'content', and 'subject'
    'subjects': []
}

######################################
# Gmail & PDF Processing Functions
######################################

def get_gmail_service():
    """
    Authenticates with Gmail and returns a Gmail API service object.
    Uses token.json if available; otherwise, prompts for user consent.
    """
    token_path = 'token.json'
    # Prompt for authentication (this will open a local server for OAuth)
    creds = InstalledAppFlow.from_client_secrets_file('credentials.json', SCOPES).run_local_server(port=8081)
    if os.path.exists(token_path):
        from google.oauth2.credentials import Credentials
        creds = Credentials.from_authorized_user_file(token_path, SCOPES)
    if not creds or not creds.valid:
        try:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                creds = InstalledAppFlow.from_client_secrets_file('credentials.json', SCOPES).run_local_server(port=8080)
        except FileNotFoundError as fnf_error:
            logger.error("credentials.json file not found. Please add it to the working folder.")
            raise RuntimeError("credentials.json file not found.") from fnf_error
        with open(token_path, 'w') as token:
            token.write(creds.to_json())
    service = build('gmail', 'v1', credentials=creds)
    return service

def get_pdf_columns_for_file(pdf_path):
    """
    Reads the first page of the PDF file using Camelot and returns a list of column headers.
    Assumes the first row is the header row.
    """
    tables = camelot.read_pdf(pdf_path, pages='1', flavor='stream')
    if not tables or len(tables) == 0:
        raise ValueError("No table found in the PDF.")
    df = tables[0].df
    return df.iloc[0].tolist()

def extract_selected_columns_for_file(pdf_path, output_excel_path, selected_columns):
    """
    Reads the PDF file, uses its first row as header, filters the DataFrame by the selected columns,
    and writes the resulting data to an Excel file.
    """
    tables = camelot.read_pdf(pdf_path, pages='1', flavor='stream')
    if not tables or len(tables) == 0:
        raise ValueError("No table found in the PDF.")
    df = tables[0].df
    df.columns = df.iloc[0]
    df = df.drop(df.index[0]).reset_index(drop=True)
    filtered_columns = [col for col in selected_columns if col in df.columns]
    if not filtered_columns:
        raise ValueError("None of the selected columns exist in the PDF data.")
    filtered_df = df[filtered_columns]
    filtered_df.to_excel(output_excel_path, index=False)

def fetch_and_cache_pdfs():
    """
    Fetches PDFs from Gmail (emails with 'invoice' in the subject and PDF attachments)
    and stores them in the global pdf_cache. Clears any previously cached data.
    """
    # Clear previous cache
    pdf_cache['pdfs'].clear()
    pdf_cache['subjects'].clear()

    service = get_gmail_service()
    results = service.users().messages().list(
        userId='me', q="subject:invoice has:attachment", maxResults=10
    ).execute()
    messages = results.get('messages', [])
    for msg in messages:
        msg_data = service.users().messages().get(userId='me', id=msg['id']).execute()
        subject_line = "(No Subject)"
        headers = msg_data.get('payload', {}).get('headers', [])
        for header in headers:
            if header['name'].lower() == 'subject':
                subject_line = header['value']
                break
        parts = msg_data.get('payload', {}).get('parts', [])
        for part in parts:
            filename = part.get('filename')
            if filename and filename.lower().endswith('.pdf'):
                att_id = part['body'].get('attachmentId')
                if att_id:
                    attachment = service.users().messages().attachments().get(
                        userId='me', messageId=msg['id'], id=att_id
                    ).execute()
                    file_data = attachment.get('data')
                    if file_data:
                        file_data = file_data.replace('-', '+').replace('_', '/')
                        file_bytes = base64.b64decode(file_data)
                        pdf_cache['pdfs'].append({
                            'filename': filename,
                            'content': file_bytes,
                            'subject': subject_line
                        })
        pdf_cache['subjects'].append(subject_line)

def get_pdf_columns_from_cache(index=0):
    """
    Reads the first page of the cached PDF (by index) and returns detected column headers.
    """
    if index >= len(pdf_cache['pdfs']):
        raise ValueError(f"No cached PDF found at index {index}.")
    pdf_bytes = pdf_cache['pdfs'][index]['content']
    with io.BytesIO(pdf_bytes) as pdf_stream:
        tables = camelot.read_pdf(pdf_stream, pages='1', flavor='stream')
        if not tables or len(tables) == 0:
            raise ValueError("No table found in the cached PDF.")
        df = tables[0].df
        return df.iloc[0].tolist()

def extract_selected_columns_from_cache(output_excel_path, selected_columns, index=0):
    """
    Processes the cached PDF (by index) to extract user-selected columns and writes them to an Excel file.
    """
    if index >= len(pdf_cache['pdfs']):
        raise ValueError(f"No cached PDF found at index {index}.")
    pdf_bytes = pdf_cache['pdfs'][index]['content']
    with io.BytesIO(pdf_bytes) as pdf_stream:
        tables = camelot.read_pdf(pdf_stream, pages='1', flavor='stream')
        if not tables or len(tables) == 0:
            raise ValueError("No table found in the cached PDF.")
        df = tables[0].df
        df.columns = df.iloc[0]
        df = df.drop(df.index[0]).reset_index(drop=True)
        filtered_columns = [col for col in selected_columns if col in df.columns]
        if not filtered_columns:
            raise ValueError("None of the selected columns exist in the PDF data.")
        filtered_df = df[filtered_columns]
        filtered_df.to_excel(output_excel_path, index=False)

######################################
# Flask API Endpoint Definition
######################################

invoice_extractor_bp = Blueprint('invoice_extractor_bp', __name__)

@invoice_extractor_bp.route('/extract_invoice_data', methods=['POST'])
@cross_origin()
def extract_invoice_data():
    """
    API endpoint to handle invoice data extraction.
    Supports three actions:
      1. 'get_columns': For PDF upload mode, returns detected columns from the first page.
      2. 'extract_data': For PDF upload mode, extracts user-selected columns and returns an Excel file.
      3. 'read_emails': For email mode:
            - Without a 'columns' parameter: fetches emails (refreshing cache) and returns columns.
            - With a 'columns' parameter: extracts the selected columns from the cached PDF.
    """
    action = request.form.get('action', '')
    upload_folder = current_app.config.get('UPLOAD_FOLDER', 'uploads')
    os.makedirs(upload_folder, exist_ok=True)

    # ----- File Upload Handling -----
    if action == 'get_columns':
        file = request.files.get('file')
        if not file:
            return jsonify({"error": "No file uploaded."}), 400
        try:
            filename = secure_filename(file.filename)
            local_path = os.path.join(upload_folder, filename)
            file.save(local_path)
            if not filename.lower().endswith('.pdf'):
                return jsonify({"error": "Only PDF files are allowed."}), 400
            columns = get_pdf_columns_for_file(local_path)
            return jsonify({"columns": columns})
        except Exception as e:
            logger.error(f"Column extraction failed: {str(e)}")
            return jsonify({"error": f"Failed to extract columns: {str(e)}"}), 500

    elif action == 'extract_data':
        file = request.files.get('file')
        columns_str = request.form.get('columns', '')
        if not file or not columns_str:
            return jsonify({"error": "File or columns parameter is missing."}), 400
        try:
            selected_columns = json.loads(columns_str)
        except Exception:
            return jsonify({"error": "Invalid columns format (must be JSON)."}), 400
        try:
            filename = secure_filename(file.filename)
            local_path = os.path.join(upload_folder, filename)
            file.save(local_path)
            output_excel = os.path.join(upload_folder, 'extracted_data.xlsx')
            extract_selected_columns_for_file(local_path, output_excel, selected_columns)
            response = send_file(output_excel,
                                 as_attachment=True,
                                 download_name="extracted_data.xlsx",
                                 mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
            # Close the response file pointer after sending
            response.call_on_close(lambda: None)
            return response
        except Exception as e:
            logger.error(f"Data extraction failed: {str(e)}")
            return jsonify({"error": str(e)}), 500

    # ----- Email Retrieval Handling -----
    elif action == 'read_emails':
        try:
            columns_str = request.form.get('columns', '').strip()
            if not columns_str:
                # No columns provided: refresh cache and fetch fresh emails
                pdf_cache['pdfs'].clear()
                pdf_cache['subjects'].clear()
                fetch_and_cache_pdfs()
                if not pdf_cache['pdfs']:
                    return jsonify({"error": "No 'invoice' emails/attachments found."}), 404
                try:
                    columns = get_pdf_columns_from_cache(0)
                    return jsonify({"columns": columns, "message": "Refreshed from Gmail."})
                except Exception as e:
                    return jsonify({"error": str(e)}), 500
            else:
                try:
                    selected_columns = json.loads(columns_str)
                except Exception:
                    return jsonify({"error": "Invalid columns format (must be JSON)."}), 400
                if not pdf_cache['pdfs']:
                    return jsonify({"error": "No cached PDFs. Please refresh first."}), 400
                output_excel = os.path.join(upload_folder, 'extracted_data.xlsx')
                try:
                    extract_selected_columns_from_cache(output_excel, selected_columns, 0)
                    response = send_file(output_excel,
                                         as_attachment=True,
                                         download_name="extracted_data.xlsx",
                                         mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                    # Ensure the response file is closed after sending
                    response.call_on_close(lambda: None)
                    return response
                except Exception as e:
                    return jsonify({"error": str(e)}), 500
        except Exception as e:
            logger.error(f"Error processing email request: {str(e)}")
            return jsonify({"error": "Internal server error"}), 500

    return jsonify({"error": "Invalid action"}), 400

######################################
# Flask App Creation
######################################

def create_app():
    app = Flask(__name__)
    app.config['UPLOAD_FOLDER'] = 'uploads'
    app.register_blueprint(invoice_extractor_bp)
    return app

######################################
# Unit Tests for the API
######################################

import unittest
from unittest.mock import patch

# Dummy side-effect functions for tests that simulate file creation
def dummy_extract_selected_columns_for_file(pdf_path, output_excel_path, selected_columns):
    # Simulate extraction by writing a dummy Excel file.
    with open(output_excel_path, 'w') as f:
        f.write("dummy content")

def dummy_extract_selected_columns_from_cache(output_excel_path, selected_columns, index=0):
    with open(output_excel_path, 'w') as f:
        f.write("dummy content")

def dummy_fetch_and_cache_pdfs():
    # Simulate fetching emails by populating the pdf_cache with a dummy PDF.
    dummy_pdf = {
        'filename': 'dummy.pdf',
        'content': b'%PDF-1.4 dummy content',
        'subject': 'Test Invoice'
    }
    pdf_cache['pdfs'] = [dummy_pdf]
    pdf_cache['subjects'] = ['Test Invoice']

class InvoiceExtractorAPITestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config['TESTING'] = True
        # Use a separate folder for testing uploads
        self.app.config['UPLOAD_FOLDER'] = 'test_uploads'
        self.client = self.app.test_client()
        os.makedirs(self.app.config['UPLOAD_FOLDER'], exist_ok=True)

    def tearDown(self):
        # Clean up files in the test upload folder
        folder = self.app.config['UPLOAD_FOLDER']
        for filename in os.listdir(folder):
            file_path = os.path.join(folder, filename)
            if os.path.isfile(file_path):
                os.remove(file_path)

    @patch('__main__.get_pdf_columns_for_file')
    def test_get_columns_file_upload(self, mock_get_columns):
        # Simulate PDF column extraction from an uploaded file
        mock_get_columns.return_value = ["Column1", "Column2"]
        dummy_pdf = (io.BytesIO(b'%PDF-1.4 dummy content'), 'dummy.pdf')
        response = self.client.post('/extract_invoice_data',
                                    data={'action': 'get_columns', 'file': dummy_pdf},
                                    content_type='multipart/form-data')
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data.get("columns"), ["Column1", "Column2"])

    @patch('__main__.extract_selected_columns_for_file', side_effect=dummy_extract_selected_columns_for_file)
    def test_extract_data_file_upload(self, mock_extract_columns):
        # Simulate successful data extraction to Excel from an uploaded PDF
        columns_param = json.dumps(["Column1"])
        dummy_pdf = (io.BytesIO(b'%PDF-1.4 dummy content'), 'dummy.pdf')
        response = self.client.post('/extract_invoice_data',
                                    data={'action': 'extract_data', 'file': dummy_pdf, 'columns': columns_param},
                                    content_type='multipart/form-data')
        # Ensure the dummy Excel file was created
        output_excel = os.path.join(self.app.config['UPLOAD_FOLDER'], 'extracted_data.xlsx')
        self.assertTrue(os.path.exists(output_excel))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.mimetype, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        # Close the response to release any open file handles
        response.close()

    @patch('__main__.fetch_and_cache_pdfs', side_effect=dummy_fetch_and_cache_pdfs)
    @patch('__main__.get_pdf_columns_from_cache')
    def test_read_emails_get_columns(self, mock_get_columns_cache, mock_fetch_pdfs):
        # Simulate email fetching and column extraction from cached PDF
        mock_get_columns_cache.return_value = ["Column1", "Column2"]
        response = self.client.post('/extract_invoice_data',
                                    data={'action': 'read_emails'},
                                    content_type='multipart/form-data')
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data.get("columns"), ["Column1", "Column2"])

    @patch('__main__.extract_selected_columns_from_cache', side_effect=dummy_extract_selected_columns_from_cache)
    def test_read_emails_extract_data(self, mock_extract_from_cache):
        # Set up the cache with a dummy PDF
        dummy_pdf = {'filename': 'dummy.pdf', 'content': b'%PDF-1.4 dummy content', 'subject': 'Test Invoice'}
        pdf_cache['pdfs'] = [dummy_pdf]
        columns_param = json.dumps(["Column1"])
        response = self.client.post('/extract_invoice_data',
                                    data={'action': 'read_emails', 'columns': columns_param},
                                    content_type='multipart/form-data')
        output_excel = os.path.join(self.app.config['UPLOAD_FOLDER'], 'extracted_data.xlsx')
        self.assertTrue(os.path.exists(output_excel))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.mimetype, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        # Close the response to release any open file handles
        response.close()

######################################
# Run App or Unit Tests
######################################

if __name__ == '__main__':
    # To run unit tests: execute "python this_file.py test"
    if len(sys.argv) > 1 and sys.argv[1] == 'test':
        sys.argv.pop(1)  # Remove the 'test' argument so that unittest doesn't get confused
        unittest.main()
    else:
        app = create_app()
        app.run(debug=True)
