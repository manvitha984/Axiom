import os
import io
import tempfile
import json
import logging
import librosa
import subprocess
import numpy as np
import soundfile as sf
import whisper
import camelot
from PyPDF2 import PdfReader
from pathlib import Path
from flask import Blueprint, request, jsonify, send_file
from flask_cors import cross_origin
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from werkzeug.utils import secure_filename

logger = logging.getLogger(__name__)

# Allowed file types
ALLOWED_EXTENSIONS = {"mp4", "avi", "mov", "wmv", "mkv"}

# Create a Blueprint for video summarizer routes
video_summarizer_bp = Blueprint('video_summarizer', __name__)

def allowed_file(filename):
    """Check if file has allowed video extension."""
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

def extract_audio(video_path):
    """
    Extract the audio stream from the video file
    and save as a .wav file using PyAV.
    """
    import av
    try:
        container = av.open(video_path)
        audio_stream = None
        for stream in container.streams:
            if stream.type == 'audio':
                audio_stream = stream
                break

        if not audio_stream:
            raise ValueError("No audio stream found in the video.")

        sample_rate = audio_stream.codec_context.sample_rate
        if not sample_rate:
            raise ValueError("Failed to retrieve sample rate.")

        samples = []
        for frame in container.decode(audio=0):
            arr = frame.to_ndarray()
            samples.append(arr)

        if not samples:
            raise ValueError("No audio frames could be decoded.")

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
    """
    Transcribe the audio using OpenAI Whisper.
    """
    try:
        logger.debug("Loading audio file...")
        audio, sr = librosa.load(audio_path, sr=16000, mono=True)
        logger.debug("Preprocessing audio...")
        audio = librosa.util.normalize(audio)
        logger.debug("Loading Whisper model...")
        model_whisper = whisper.load_model("medium")  # medium model for better accuracy
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
            for seg in result['segments']:
                formatted_text += seg['text'] + " "
        else:
            formatted_text = result.get('text', "")
        logger.debug(f"Transcription completed with {len(formatted_text)} characters")
        return formatted_text.strip()
    except Exception as e:
        logger.error(f"Transcription failed: {str(e)}")
        raise RuntimeError(f"Transcription failed: {str(e)}")

def generate_pdf_transcription(transcription_text):
    """
    Takes a transcription text and generates a PDF file with the text.
    """
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
    """Reads text content from a PDF file."""
    text = ""
    try:
        with open(pdf_path, 'rb') as f:
            reader = PdfReader(f)
            for page in reader.pages:
                text += page.extract_text() or ""
        return text
    except Exception as e:
        logger.error(f"Error reading PDF: {e}")
        raise

def generate_summary_pdf(summary_text, title="Video Summary"):
    """Generate a PDF file containing the summary."""
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

def summarize_video_with_gemini(text):
    """Generates a summary using Gemini API via Node.js script."""
    try:
        script_path = Path(__file__).parent / 'gemini_summarize.js'
        if not script_path.exists():
            logger.error(f"gemini_summarize.js not found at {script_path}")
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
    except subprocess.TimeoutExpired:
        logger.error("Gemini summary API call timed out")
        return "Summary generation timed out"
    except subprocess.CalledProcessError as e:
        logger.error(f"Error calling gemini_summarize.js: {e.output}")
        return f"Summary failed: {e.output}"
    except Exception as e:
        logger.error(f"Unexpected error in Gemini summary: {str(e)}")
        return f"Summary error: {str(e)}"

@video_summarizer_bp.route('/videosummarizer', methods=["POST"])
@cross_origin()
def video_summarizer():
    """Handle video upload and generate summary (PDF) + store text."""
    try:
        if "file" not in request.files:
            return jsonify({"error": "No file uploaded"}), 400

        file = request.files["file"]
        if file.filename == "":
            return jsonify({"error": "No file selected"}), 400

        if not allowed_file(file.filename):
            return jsonify({"error": f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"}), 400

        upload_folder = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
        os.makedirs(upload_folder, exist_ok=True)
        filename = secure_filename(file.filename)
        uploaded_path = os.path.join(upload_folder, filename)
        logger.debug(f"Saving file to: {uploaded_path}")
        file.save(uploaded_path)

        try:
            audio_path = extract_audio(uploaded_path)
            transcription = transcribe_audio_whisper(audio_path)

            pdf_path = generate_pdf_transcription(transcription)
            pdf_text = read_pdf_content(pdf_path)

            gemini_summary = summarize_video_with_gemini(pdf_text)
            logger.debug(f"Generated summary: {gemini_summary}")

            summary_pdf_path = generate_summary_pdf(gemini_summary)

            # Clean up
            for temp_file in [uploaded_path, audio_path, pdf_path]:
                try:
                    if os.path.exists(temp_file):
                        os.remove(temp_file)
                except Exception as cleanup_e:
                    logger.error(f"Error cleaning up file {temp_file}: {cleanup_e}")

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

@video_summarizer_bp.route('/extract_summary_text', methods=['POST'])
@cross_origin()
def extract_summary_text():
    """Extract text from the last generated summary for translation."""
    try:
        if "file" not in request.files:
            return jsonify({"error": "No file uploaded"}), 400

        file = request.files["file"]
        if file.filename == "":
            return jsonify({"error": "No file selected"}), 400

        if not allowed_file(file.filename):
            return jsonify({"error": f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"}), 400

        upload_folder = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
        os.makedirs(upload_folder, exist_ok=True)

        filename = secure_filename(file.filename)
        uploaded_path = os.path.join(upload_folder, filename)
        logger.debug(f"Saving file to: {uploaded_path}")
        file.save(uploaded_path)

        try:
            audio_path = extract_audio(uploaded_path)
            transcription = transcribe_audio_whisper(audio_path)
            pdf_path = generate_pdf_transcription(transcription)
            pdf_text = read_pdf_content(pdf_path)
            summary_text = summarize_video_with_gemini(pdf_text)

            # Clean up
            for temp_file in [uploaded_path, audio_path, pdf_path]:
                try:
                    if os.path.exists(temp_file):
                        os.remove(temp_file)
                except Exception as cleanup_e:
                    logger.error(f"Cleanup error: {cleanup_e}")

            return jsonify({"text": summary_text})

        except Exception as process_e:
            logger.error(f"Error processing video: {str(process_e)}")
            return jsonify({"error": f"Failed to generate summary: {str(process_e)}"}), 500

    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        return jsonify({"error": str(e)}), 500