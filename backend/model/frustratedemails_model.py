import os
import json
import subprocess
import pickle
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
import re
import nltk

# Download required NLTK data
nltk.download('stopwords', quiet=True)
nltk.download('wordnet', quiet=True)

# Load the trained model and vectorizer
current_dir = os.path.dirname(__file__)
model_path = os.path.join(current_dir, 'model.pkl')
vectorizer_path = os.path.join(current_dir, 'tfidf.pkl')

try:
    with open(model_path, 'rb') as f:
        model = pickle.load(f)
    with open(vectorizer_path, 'rb') as f:
        tfidf = pickle.load(f)
except Exception as e:
    print(f"Error loading model files: {str(e)}")
    raise

def preprocess_text(text):
    # Remove HTML tags, URLs, and special characters
    text = re.sub(r'<.*?>|http\S+|[^a-zA-Z\s]', '', str(text))
    # Convert to lowercase and tokenize
    tokens = text.lower().split()
    # Remove stopwords and lemmatize
    lemmatizer = WordNetLemmatizer()
    tokens = [lemmatizer.lemmatize(word) for word in tokens if word not in stopwords.words('english')]
    return ' '.join(tokens)

def predict_frustration_custom(text):
    """Predicts frustration level using the custom trained model"""
    try:
        cleaned_text = preprocess_text(text)
        features = tfidf.transform([cleaned_text])
        probability = model.predict_proba(features)[0][1]
        print(f"[Custom Model] Prediction: {probability:.3f}")
        return float(probability)
    except Exception as e:
        print(f"[Custom Model] Error: {str(e)}")
        return 0.5

def predict_frustration_gemini(text):
    """Predicts frustration level using the Gemini API"""
    try:
        # Get the path to gemini_predict.js
        gemini_script = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'gemini_predict.js')
        
        # Escape the text for command line
        escaped_text = json.dumps(text)
        
        # Call the Node.js script
        result = subprocess.run(
            ['node', gemini_script, escaped_text],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if result.returncode != 0:
            print(f"[Gemini] Error: {result.stderr}")
            return 0.5
            
        # Parse the response
        try:
            output = json.loads(result.stdout)
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

def predict_combined_frustration(text, weight_custom=0.6, weight_gemini=0.4):
    """Combines predictions from both models"""
    if not text:
        return 0.0, 0.0, 0.0, False

    print("\n=== Analysis for text ===")
    print(f"Text preview: {text[:100]}...")
    
    # Get predictions
    score_custom = predict_frustration_custom(text)
    score_gemini = predict_frustration_gemini(text)
    
    # Calculate combined score
    final_score = (weight_custom * score_custom) + (weight_gemini * score_gemini)
    is_frustrated = final_score > 0.5
    
    # Log results
    print("\n=== Results ===")
    print(f"Custom Model Score: {score_custom:.3f}")
    print(f"Gemini API Score: {score_gemini:.3f}")
    print(f"Combined Score: {final_score:.3f}")
    print(f"Classification: {'Frustrated' if is_frustrated else 'Not Frustrated'}")
    print("=" * 30 + "\n")
    
    return score_custom, score_gemini, final_score, is_frustrated

# Add test function
def test_prediction():
    test_texts = [
        "I am extremely frustrated with your service. This is unacceptable!",
        "Thank you for your help. Everything works perfectly.",
        "Still waiting for a response after 3 days. This is ridiculous."
    ]
    
    for i, text in enumerate(test_texts, 1):
        print(f"\nTest {i}:")
        predict_combined_frustration(text)

if __name__ == "__main__":
    test_prediction()