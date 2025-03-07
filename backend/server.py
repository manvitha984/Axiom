import os
import io
import logging
import subprocess
import nltk
from flask import Flask, request, jsonify, send_file, render_template
from flask_cors import CORS, cross_origin
from werkzeug.utils import secure_filename
from pathlib import Path
from googletrans import Translator
# Email & summarizer imports
from email_processor import fetch_and_classify_emails
from video_summarizer import video_summarizer_bp, generate_summary_pdf
from invoice_extractor import invoice_extractor_bp
nltk.download('stopwords')
nltk.download('wordnet')

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Enable CORS for all routes and allow all origins
CORS(app, resources={r"/*": {"origins": "*"}})

# Register the blueprints
app.register_blueprint(video_summarizer_bp)
app.register_blueprint(invoice_extractor_bp)

# Configure upload folder
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