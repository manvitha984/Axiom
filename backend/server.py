import os
from flask import Flask, request, jsonify, send_file, render_template
from flask_cors import CORS
import pickle
import re
import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
import tempfile
import logging
from pathlib import Path
import av
import numpy as np
import soundfile as sf
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
import whisper
import librosa
from werkzeug.utils import secure_filename

nltk.download('stopwords')
nltk.download('wordnet')

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS on all routes

# ---------------------------
# Predict endpoint (Frustrated Email Predictor)
# ---------------------------
with open('model/model.pkl', 'rb') as f:
    model = pickle.load(f)
with open('model/tfidf.pkl', 'rb') as f:
    tfidf = pickle.load(f)

def preprocess_text(text):
    text = re.sub(r'<.*?>|http\S+|[^a-zA-Z\s]', '', text)
    tokens = text.lower().split()
    lemmatizer = WordNetLemmatizer()
    tokens = [lemmatizer.lemmatize(word) for word in tokens if word not in stopwords.words('english')]
    return ' '.join(tokens)

@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json()
    text = data.get("text", "")
    cleaned_text = preprocess_text(text)
    features = tfidf.transform([cleaned_text])
    prediction = model.predict(features)[0]
    return jsonify({"isFrustrated": bool(prediction)})

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
                start_time = f"[{int(segment['start']//60):02d}:{int(segment['start']%60):02d}.{int((segment['start']%1)*100):02d}]"
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
            Spacer(1, 0.5*inch)
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

@app.route("/videosummarizer", methods=["POST"])
def video_summarizer():
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
            audio_path = extract_audio(uploaded_path)
            transcription = transcribe_audio_whisper(audio_path)
            pdf_path = generate_pdf_transcription(transcription)
            try:
                os.remove(uploaded_path)
                os.remove(audio_path)
            except Exception as cleanup_e:
                logger.error(f"Error cleaning up files: {cleanup_e}")
            return send_file(
                pdf_path,
                as_attachment=True,
                download_name="video_transcription.pdf",
                mimetype="application/pdf"
            )
        except Exception as process_e:
            try:
                os.remove(uploaded_path)
            except Exception:
                pass
            logger.error(f"Error processing video: {str(process_e)}")
            return jsonify({"error": f"Failed to generate summary: {str(process_e)}"}), 500
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(port=5000, debug=True)