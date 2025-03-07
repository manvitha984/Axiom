import os
import io
import base64
import camelot
import logging
from pathlib import Path
from flask import Blueprint, request, jsonify, send_file
from flask_cors import cross_origin
from werkzeug.utils import secure_filename
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials

# Create a Blueprint for invoice extractor routes
invoice_extractor_bp = Blueprint('invoice_extractor_bp', __name__)
logger = logging.getLogger(__name__)

# Gmail permissions for reading invoice emails
SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']


def get_gmail_service():
    """
    Authenticates with Gmail and returns a Gmail API service object,
    reusing or creating token.json to avoid repeated permissions.
    """
    token_path = 'token.json'
    creds = InstalledAppFlow.from_client_secrets_file('credentials.json', SCOPES).run_local_server(port=8081)
    if os.path.exists(token_path):
        creds = Credentials.from_authorized_user_file(token_path, SCOPES)
    if not creds or not creds.valid:
        try:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                creds = InstalledAppFlow.from_client_secrets_file('credentials.json', SCOPES).run_local_server(port=8080)
        except FileNotFoundError as fnf_error:
            logger.error("credentials.json file not found. Please add it to the backend folder.")
            raise RuntimeError("credentials.json file not found.") from fnf_error
        with open(token_path, 'w') as token:
            token.write(creds.to_json())
    service = build('gmail', 'v1', credentials=creds)
    return service

# Extract first and last names from the first page of a PDF
def extract_first_and_last_names(pdf_path, output_excel_path):
    """
    Reads the first page of the PDF to extract columns:
    'First Name' & 'Last Name'. Saves them into an Excel file.
    """
    tables = camelot.read_pdf(pdf_path, pages='1', flavor='stream')
    df = tables[0].df
    df.columns = df.iloc[0]
    df = df.drop(df.index[0]).reset_index(drop=True)
    df = df.rename(columns={'First Name': 'first_name', 'Last Name': 'last_name'})
    filtered_df = df[['first_name', 'last_name']]
    filtered_df.to_excel(output_excel_path, index=False)


# Fetch PDFs from emails with 'invoice' in the subject
def fetch_pdfs_from_invoices(app):
    """
    Searches the user's Gmail inbox for recent messages containing
    "invoice" in the subject and PDF attachments. Downloads them
    into UPLOAD_FOLDER, then returns an array of PDF paths plus any
    associated email subjects.
    """
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
            filename = part.get('filename')
            if filename and filename.lower().endswith('.pdf'):
                att_id = part['body'].get('attachmentId')
                if att_id:
                    attachment = service.users().messages().attachments() \
                        .get(userId='me', messageId=msg['id'], id=att_id).execute()
                    file_data = attachment.get('data')
                    if file_data:
                        file_data = file_data.replace('-', '+').replace('_', '/')
                        file_bytes = io.BytesIO(base64.b64decode(file_data))
                        local_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                        with open(local_path, 'wb') as f:
                            f.write(file_bytes.getbuffer())
                        pdf_paths.append(local_path)

    return pdf_paths, subjects


# Route to extract invoice data from PDFs
@invoice_extractor_bp.route('/extract_invoice_data', methods=['POST'])
@cross_origin()
def extract_invoice_data():
    """
    This route handles two possible actions:
      1) 'upload': user uploads a PDF and we extract the columns.
      2) 'read_emails': fetches PDFs from emails with 'invoice' in subject.
    """
    from flask import current_app as app
    action = request.form.get('action')
    if action == 'upload':
        file = request.files['file']
        if file:
            filename = secure_filename(file.filename)
            local_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(local_path)

            # Extract columns into an Excel file
            output_excel = 'extracted_names.xlsx'
            extract_first_and_last_names(local_path, output_excel)

            return send_file(
                output_excel,
                as_attachment=True,
                download_name="extracted_names.xlsx",
                mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            )
        return jsonify({"error": "No file uploaded."}), 400

    elif action == 'read_emails':
        pdf_files, subjects = fetch_pdfs_from_invoices(app)
        logger.info(f"Email subjects found: {subjects}")
        if not pdf_files:
            return "<div style='padding: 20px; font-size: 1.2rem;'>No emails found with 'invoice' in the subject.</div>"

        # For demonstration, process the first PDF retrieved
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