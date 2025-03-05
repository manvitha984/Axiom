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

@app.route('/translate_summary', methods=['POST'])
@cross_origin()
def translate_summary():
    try:
        data = request.get_json()
        original_text = data.get('text', '')
        target_language = data.get('language', 'en')
        
        if not original_text:
            return jsonify({"error": "No text provided"}), 400
            
        # Initialize translator
        translator = Translator()
        
        # Translate text
        translation = translator.translate(original_text, dest=target_language)
        translated_text = translation.text
        
        # Generate PDF with translated content
        pdf_path = generate_summary_pdf(translated_text, f"Video Summary ({target_language.upper()})")
        
        # Return the translated PDF
        return send_file(
            pdf_path,
            as_attachment=True,
            download_name=f"video_summary_{target_language}.pdf",
            mimetype="application/pdf"
        )
        
    except Exception as e:
        logger.error(f"Error translating summary: {str(e)}")
        return jsonify({"error": f"Translation failed: {str(e)}"}), 500
    

# ---------------------------
# Video Summarizer Feature
# ---------------------------
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = 50 * 1024 * 1024  # 50MB
Path(UPLOAD_FOLDER).mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {"mp4", "avi", "mov", "wmv", "mkv"}


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def extract_audio(video_path):
    try:
        container = av.open(video_path)
        audio_stream = next((s for s in container.streams if s.type == 'audio'), None)
        if not audio_stream:
            raise RuntimeError("No audio stream found in video")
        sample_rate = audio_stream.codec_context.sample_rate
        if not sample_rate:
            raise RuntimeError("Could not determine sample rate")
        samples = []
        for frame in container.decode(audio=0):
            array = frame.to_ndarray()
            if array.ndim == 1:
                array = array.reshape(-1, 1)
            samples.append(array)
        if not samples:
            raise RuntimeError("No audio data extracted")
        audio_array = np.concatenate(samples, axis=0)
        audio_array = audio_array.reshape(-1, audio_stream.channels)
        temp_dir = tempfile.gettempdir()
        audio_path = os.path.join(temp_dir, "temp_audio.wav")
        sf.write(audio_path, audio_array, sample_rate)
        return audio_path
    except Exception as e:
        logger.error(f"Audio extraction failed: {str(e)}")
        raise


def transcribe_audio_whisper(audio_path):
    try:
        logger.debug("Loading audio file...")
        audio, sr = librosa.load(audio_path, sr=16000, mono=True)
        logger.debug("Preprocessing audio...")
        audio = librosa.util.normalize(audio)
        logger.debug("Loading Whisper model...")
        model_whisper = whisper.load_model("medium")  # Using medium model for better accuracy
        logger.debug("Starting transcription...")
        result = model_whisper.transcribe(
            audio,
            fp16=False,
            language='en',
            initial_prompt="This is a clear speech recording.",
            word_timestamps=True,
            verbose=True,
            condition_on_previous_text=True,
            temperature=0.0
        )
        logger.debug("Formatting transcription...")
        formatted_text = ""
        if 'segments' in result:
            for segment in result['segments']:
                start_time = f"[{int(segment['start'] // 60):02d}:{int(segment['start'] % 60):02d}.{int((segment['start'] % 1) * 100):02d}]"
                formatted_text += f"{start_time} {segment['text'].strip()}\n\n"
        else:
            formatted_text = result['text']
        logger.debug(f"Transcription completed with {len(formatted_text)} characters")
        return formatted_text
    except Exception as e:
        logger.error(f"Transcription failed: {str(e)}")
        raise RuntimeError(f"Transcription failed: {str(e)}")


def generate_pdf_transcription(transcription_text):
    try:
        pdf_path = os.path.join(tempfile.gettempdir(), "video_transcription.pdf")
        doc = SimpleDocTemplate(
            pdf_path,
            pagesize=letter,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=72
        )
        styles = getSampleStyleSheet()
        title_style = styles["Title"]
        normal_style = ParagraphStyle(
            'CustomNormal',
            parent=styles['Normal'],
            spaceBefore=12,
            spaceAfter=12,
            fontSize=11,
            leading=16
        )
        paragraphs = transcription_text.split('\n\n')
        story = [
            Paragraph("Video Transcription", title_style),
            Spacer(1, 0.5 * inch)
        ]
        for para in paragraphs:
            if para.strip():
                story.append(Paragraph(para.strip(), normal_style))
        doc.build(story)
        if not os.path.exists(pdf_path):
            raise FileNotFoundError("PDF generation failed")
        logger.debug(f"PDF generated at: {pdf_path}")
        return pdf_path
    except Exception as e:
        logger.error(f"PDF generation error: {e}")
        raise RuntimeError(f"PDF generation error: {e}")


def read_pdf_content(pdf_path):
    """Reads the text content from a PDF file."""
    text = ""
    try:
        with open(pdf_path, 'rb') as f:
            reader = PdfReader(f)
            for page in reader.pages:
                text += page.extract_text()
        return text
    except Exception as e:
        logger.error(f"Error reading PDF: {e}")
        raise


def generate_summary_pdf(summary_text, title="Video Summary"):
    """Generate a PDF file containing the summary"""
    try:
        pdf_path = os.path.join(tempfile.gettempdir(), f"video_summary_{hash(summary_text)}.pdf")
        doc = SimpleDocTemplate(
            pdf_path,
            pagesize=letter,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=72
        )

        styles = getSampleStyleSheet()
        title_style = styles["Title"]
        normal_style = ParagraphStyle(
            'CustomNormal',
            parent=styles['Normal'],
            spaceBefore=12,
            spaceAfter=12,
            fontSize=11,
            leading=16
        )

        story = [
            Paragraph(title, title_style),
            Spacer(1, 0.5 * inch),
            Paragraph(summary_text, normal_style)
        ]

        doc.build(story)
        return pdf_path
    except Exception as e:
        logger.error(f"Error generating summary PDF: {e}")
        raise

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

@app.route('/extract_summary_text', methods=['POST'])
@cross_origin()
def extract_summary_text():
    """Extract text from the last generated summary"""
    try:
        if "file" not in request.files:
            return jsonify({"error": "No file uploaded"}), 400
            
        # Process the video but only return the extracted text
        file = request.files["file"]
        if file.filename == "":
            return jsonify({"error": "No file selected"}), 400
            
        if not allowed_file(file.filename):
            return jsonify({"error": f"Invalid file type. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"}), 400
            
        filename = secure_filename(file.filename)
        uploaded_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
        logger.debug(f"Saving file to: {uploaded_path}")
        file.save(uploaded_path)
        
        try:
            # Process the video
            audio_path = extract_audio(uploaded_path)
            transcription = transcribe_audio_whisper(audio_path)
            pdf_path = generate_pdf_transcription(transcription)
            pdf_text = read_pdf_content(pdf_path)
            summary_text = summarize_video_with_gemini(pdf_text)
            
            # Clean up temporary files
            for temp_file in [uploaded_path, audio_path, pdf_path]:
                try:
                    if os.path.exists(temp_file):
                        os.remove(temp_file)
                except Exception as cleanup_e:
                    logger.error(f"Error cleaning up file {temp_file}: {cleanup_e}")
            
            return jsonify({"text": summary_text})
            
        except Exception as process_e:
            logger.error(f"Error processing video: {str(process_e)}")
            return jsonify({"error": f"Failed to generate summary: {str(process_e)}"}), 500
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        return jsonify({"error": str(e)}), 500
    
    
@app.route("/videosummarizer", methods=["POST"])
@cross_origin()
def video_summarizer():
    """Handle video upload and generate summary"""
    try:
        if "file" not in request.files:
            return jsonify({"error": "No file uploaded"}), 400

        file = request.files["file"]
        if file.filename == "":
            return jsonify({"error": "No file selected"}), 400

        if not allowed_file(file.filename):
            return jsonify({"error": f"Invalid file type. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"}), 400

        filename = secure_filename(file.filename)
        uploaded_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
        logger.debug(f"Saving file to: {uploaded_path}")
        file.save(uploaded_path)

        try:
            # Process the video
            audio_path = extract_audio(uploaded_path)
            transcription = transcribe_audio_whisper(audio_path)

            # Generate initial PDF with transcription
            pdf_path = generate_pdf_transcription(transcription)
            pdf_text = read_pdf_content(pdf_path)

            # Get summary from Gemini
            gemini_summary = summarize_video_with_gemini(pdf_text)
            logger.debug(f"Generated summary: {gemini_summary}")

            # Generate final PDF with summary
            summary_pdf_path = generate_summary_pdf(gemini_summary)

            # Clean up temporary files
            for temp_file in [uploaded_path, audio_path, pdf_path]:
                try:
                    if os.path.exists(temp_file):
                        os.remove(temp_file)
                except Exception as cleanup_e:
                    logger.error(f"Error cleaning up file {temp_file}: {cleanup_e}")

            # Return the summary PDF
            return send_file(
                summary_pdf_path,
                as_attachment=True,
                download_name="video_summary.pdf",
                mimetype="application/pdf"
            )

        except Exception as process_e:
            logger.error(f"Error processing video: {str(process_e)}")
            return jsonify({"error": f"Failed to generate summary: {str(process_e)}"}), 500

    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        return jsonify({"error": str(e)}), 500




def summarize_video_with_gemini(text):
    """Generates summary using Gemini API via Node.js script"""
    try:
        script_path = Path(__file__).parent / 'gemini_summarize.js'
        if not script_path.exists():
            logger.error(f"gemini_summarize.js not found at {script_path}")
            return "Summary generation failed - missing script"

        # Escape text for command line
        escaped_text = json.dumps(text)

        # Call Node.js script with the text
        result = subprocess.check_output(
            ["node", str(script_path), escaped_text],
            stderr=subprocess.STDOUT,
            universal_newlines=True,
            timeout=60  # Longer timeout for summarization
        )

        # Parse the JSON response
        try:
            response = json.loads(result)
            if 'error' in response:
                logger.error(f"Gemini summary error: {response['error']}")
                return f"Summary error: {response['error']}"
            return response.get('summary', 'No summary generated')
        except json.JSONDecodeError:
            logger.error(f"Invalid JSON response: {result}")
            return "Summary error: Invalid API response"

    except subprocess.TimeoutExpired:
        logger.error("Gemini summary API call timed out")
        return "Summary generation timed out"
    except subprocess.CalledProcessError as e:
        logger.error(f"Error calling gemini_summarize.js: {e.output}")
        return f"Summary failed: {e.output}"
    except Exception as e:
        logger.error(f"Unexpected error in Gemini summary: {str(e)}")
        return f"Summary error: {str(e)}"


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


if __name__ == '__main__':
    app.run(port=5000, debug=True, use_reloader=False)