import os
import json
import subprocess
import pickle
import re
import sys
import unittest
import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from dotenv import load_dotenv

# Load environment variables from the .env file 
env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
load_dotenv(dotenv_path=env_path)
# Debug print to ensure the variable is loaded
print("GEMINI_API_KEY:", os.environ.get("GEMINI_API_KEY"))

# Download required NLTK data
nltk.download('stopwords', quiet=True)
nltk.download('wordnet', quiet=True)

class FrustrationPredictor:
    def __init__(self):
        """Load the trained model and vectorizer from disk."""
        current_dir = os.path.dirname(__file__)
        self.model_path = os.path.join(current_dir, 'model.pkl')
        self.vectorizer_path = os.path.join(current_dir, 'tfidf.pkl')
        try:
            with open(self.model_path, 'rb') as f:
                self.model = pickle.load(f)
            with open(self.vectorizer_path, 'rb') as f:
                self.tfidf = pickle.load(f)
        except Exception as e:
            print(f"Error loading model files: {str(e)}")
            raise

    @staticmethod
    def preprocess_text(text):
        """
        Remove HTML tags, URLs, and special characters from the text.
        Then tokenize, lowercase, remove stopwords, and lemmatize.
        """
        text = re.sub(r'<.*?>|http\S+|[^a-zA-Z\s]', '', str(text))
        tokens = text.lower().split()
        lemmatizer = WordNetLemmatizer()
        tokens = [lemmatizer.lemmatize(word) for word in tokens if word not in stopwords.words('english')]
        return ' '.join(tokens)

    def predict_frustration_custom(self, text):
        """Predicts frustration level using the custom trained model."""
        try:
            cleaned_text = FrustrationPredictor.preprocess_text(text)
            features = self.tfidf.transform([cleaned_text])
            probability = self.model.predict_proba(features)[0][1]
            print(f"[Custom Model] Prediction: {probability:.3f}")
            return float(probability)
        except Exception as e:
            print(f"[Custom Model] Error: {str(e)}")
            return 0.5

    def predict_frustration_gemini(self, text):
        """Predicts frustration level using the Gemini API via a Node.js script."""
        try:
            gemini_script = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'gemini_predict.js')
            escaped_text = json.dumps(text)
            result = subprocess.run(
                ['node', gemini_script, escaped_text],
                capture_output=True,
                text=True,
                timeout=30
            )
            if result.returncode != 0:
                print(f"[Gemini] Error: {result.stderr}")
                return 0.5
            try:
                # Clean the stdout to extract JSON using regex
                cleaned_stdout = result.stdout.strip()
                # Use a non-greedy regex to extract the first JSON object
                match = re.search(r'(\{.*?\})', cleaned_stdout, re.DOTALL)
                if match:
                    json_str = match.group(1)
                else:
                    print(f"[Gemini] No JSON found in output: {cleaned_stdout}")
                    return 0.5
                output = json.loads(json_str)
                confidence = output.get('confidence')
                if confidence is None or not isinstance(confidence, (int, float)):
                    print(f"[Gemini] Invalid confidence value: {output}")
                    return 0.5
                print(f"[Gemini] Prediction: {confidence:.3f}")
                return float(confidence)
            except json.JSONDecodeError as e:
                print(f"[Gemini] JSON parsing error: {e}")
                print(f"[Gemini] Raw output: {result.stdout}")
                return 0.5
        except Exception as e:
            print(f"[Gemini] Unexpected error: {str(e)}")
            return 0.5

    def predict_combined_frustration(self, text, weight_custom=0.4, weight_gemini=0.6):
        """
        Combines predictions from the custom model and the Gemini API.
        Returns a tuple: (score_custom, score_gemini, combined_score, is_frustrated)
        """
        if not text:
            return 0.0, 0.0, 0.0, False

        print("\n=== Analysis for text ===")
        print(f"Text preview: {text[:100]}...")
        score_custom = self.predict_frustration_custom(text)
        score_gemini = self.predict_frustration_gemini(text)
        final_score = (weight_custom * score_custom) + (weight_gemini * score_gemini)
        is_frustrated = final_score > 0.5

        print("\n=== Results ===")
        print(f"Custom Model Score: {score_custom:.3f}")
        print(f"Gemini API Score: {score_gemini:.3f}")
        print(f"Combined Score: {final_score:.3f}")
        print(f"Classification: {'Frustrated' if is_frustrated else 'Not Frustrated'}")
        print("=" * 30 + "\n")

        return score_custom, score_gemini, final_score, is_frustrated

    def demo_predictions(self):
        """Demonstrate predictions on a set of test texts."""
        test_texts = [
            "I am extremely frustrated with your service. This is unacceptable!",
            "Thank you for your help. Everything works perfectly.",
            "Still waiting for a response after 3 days. This is ridiculous."
        ]
        for i, text in enumerate(test_texts, 1):
            print(f"\nDemo Test {i}:")
            self.predict_combined_frustration(text)

# ---------------------------
# Unit Tests
# ---------------------------

class TestFrustrationPredictor(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        try:
            cls.predictor = FrustrationPredictor()
        except Exception as e:
            cls.predictor = None
            raise unittest.SkipTest("Model files not available for testing.")

    def test_preprocess_text(self):
        sample_text = "<p>This is a Test! Visit http://example.com</p>"
        processed = FrustrationPredictor.preprocess_text(sample_text)
        self.assertIn("test", processed)
        self.assertNotIn("http", processed)
        self.assertNotIn("<", processed)

    def test_predict_frustration_custom(self):
        if self.predictor:
            result = self.predictor.predict_frustration_custom("I am frustrated")
            self.assertIsInstance(result, float)
            self.assertGreaterEqual(result, 0.0)
            self.assertLessEqual(result, 1.0)

    def test_predict_frustration_gemini(self):
        if self.predictor:
            result = self.predictor.predict_frustration_gemini("I am frustrated")
            self.assertIsInstance(result, float)
            self.assertGreaterEqual(result, 0.0)
            self.assertLessEqual(result, 1.0)

    def test_predict_combined_frustration(self):
        if self.predictor:
            output = self.predictor.predict_combined_frustration("I am frustrated with the service")
            self.assertIsInstance(output, tuple)
            self.assertEqual(len(output), 4)
            score_custom, score_gemini, final_score, is_frustrated = output
            self.assertIsInstance(score_custom, float)
            self.assertIsInstance(score_gemini, float)
            self.assertIsInstance(final_score, float)
            self.assertIsInstance(is_frustrated, bool)

# ---------------------------
# Main Execution
# ---------------------------

if __name__ == "__main__":
    if 'test' in sys.argv:
        sys.argv.remove('test')
        unittest.main()
    else:
        predictor = FrustrationPredictor()
        predictor.demo_predictions()