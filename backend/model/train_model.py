import os
import re
import pickle
import sys
import unittest
import pandas as pd
import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, precision_recall_fscore_support

# ---------------------------
# Helper Functions
# ---------------------------

def download_nltk_resources():
    nltk.download('stopwords')
    nltk.download('wordnet')

def load_dataset(file_path):
    df = pd.read_csv(file_path)
    return df

def clean_data(df):
    """Remove rows with null values in 'text' or 'label' and convert label to integer."""
    df = df.dropna(subset=['text', 'label'])
    # Use .loc to avoid SettingWithCopyWarning
    df.loc[:, 'label'] = df['label'].astype(int)
    return df

def preprocess_text(text):
    """Remove HTML tags, URLs, and special characters; then tokenize, lowercase, remove stopwords, and lemmatize."""
    # Remove HTML tags, URLs, and non-letter characters
    text = re.sub(r'<.*?>|http\S+|[^a-zA-Z\s]', '', text)
    tokens = text.lower().split()
    lemmatizer = WordNetLemmatizer()
    tokens = [lemmatizer.lemmatize(word) for word in tokens if word not in stopwords.words('english')]
    return ' '.join(tokens)

def apply_preprocessing(df):
    """Apply text preprocessing and remove rows with empty cleaned text."""
    df['cleaned_text'] = df['text'].apply(preprocess_text)
    df = df[df['cleaned_text'].str.strip() != '']
    return df

def split_data(df, test_size=0.2, random_state=42):
    """Split the DataFrame into training and validation sets."""
    X_train, X_val, y_train, y_val = train_test_split(
        df['cleaned_text'], df['label'], test_size=test_size, random_state=random_state
    )
    return X_train, X_val, y_train, y_val

def vectorize_text(X_train, X_val, max_features=1000, ngram_range=(1,2)):
    """Fit a TF-IDF vectorizer on the training data and transform both training and validation sets."""
    tfidf = TfidfVectorizer(max_features=max_features, ngram_range=ngram_range)
    X_train_tfidf = tfidf.fit_transform(X_train)
    X_val_tfidf = tfidf.transform(X_val)
    return tfidf, X_train_tfidf, X_val_tfidf

def train_model(X_train_tfidf, y_train):
    """Perform hyperparameter tuning using GridSearchCV and return the best model."""
    model = LogisticRegression(class_weight='balanced', max_iter=1000)
    param_grid = {
        'C': [0.01, 0.1, 1, 10, 100],
        'penalty': ['l2'],
        'solver': ['lbfgs']
    }
    grid_search = GridSearchCV(model, param_grid, cv=5, scoring='f1')
    grid_search.fit(X_train_tfidf, y_train)
    best_model = grid_search.best_estimator_
    return best_model, grid_search.best_params_

def evaluate_model(model, X_val_tfidf, y_val):
    """Evaluate the model and return a dictionary with performance metrics."""
    y_pred = model.predict(X_val_tfidf)
    accuracy = accuracy_score(y_val, y_pred)
    precision, recall, f1, _ = precision_recall_fscore_support(y_val, y_pred, average='binary')
    metrics = {
        'accuracy': accuracy,
        'precision': precision,
        'recall': recall,
        'f1': f1
    }
    return metrics

def save_artifacts(model, tfidf, model_path, vectorizer_path):
    """Save the trained model and TF-IDF vectorizer using pickle."""
    with open(model_path, 'wb') as f:
        pickle.dump(model, f)
    with open(vectorizer_path, 'wb') as f:
        pickle.dump(tfidf, f)

def train_model_pipeline(csv_file, model_path, vectorizer_path):
    """Run the full training pipeline."""
    download_nltk_resources()
    df = load_dataset(csv_file)
    df = clean_data(df)
    df = apply_preprocessing(df)
    X_train, X_val, y_train, y_val = split_data(df)
    tfidf, X_train_tfidf, X_val_tfidf = vectorize_text(X_train, X_val)
    best_model, best_params = train_model(X_train_tfidf, y_train)
    best_model.fit(X_train_tfidf, y_train)
    metrics = evaluate_model(best_model, X_val_tfidf, y_val)
    save_artifacts(best_model, tfidf, model_path, vectorizer_path)
    return best_model, tfidf, metrics, best_params

# ---------------------------
# Unit Tests
# ---------------------------

class TestEmailClassifier(unittest.TestCase):
    
    def test_preprocess_text(self):
        # Test that HTML tags, URLs, and non-letter characters are removed and that text is lowercased.
        sample_text = "<p>This is a Test! Visit http://example.com</p>"
        processed = preprocess_text(sample_text)
        # Expected output: "this is a test visit" -> after stopword removal, "test visit" remains.
        self.assertNotIn('<', processed)
        self.assertNotIn('http', processed)
        self.assertEqual(processed, 'test visit')
    
    def test_clean_data(self):
        # Create a sample DataFrame with missing values.
        data = {
            'text': ["Test email", None, "Another email"],
            'label': [1, 0, None]
        }
        df = pd.DataFrame(data)
        df_clean = clean_data(df)
        self.assertEqual(len(df_clean), 1)
    
    def test_split_data(self):
        # Create a small DataFrame and test the splitting.
        data = {
            'text': ["email one", "email two", "email three", "email four"],
            'label': [1, 0, 1, 0]
        }
        df = pd.DataFrame(data)
        df['cleaned_text'] = df['text']  # Assume no additional processing for this test.
        X_train, X_val, y_train, y_val = split_data(df, test_size=0.5, random_state=42)
        self.assertEqual(len(X_train), 2)
        self.assertEqual(len(X_val), 2)
    
    def test_vectorize_text(self):
        # Test that the vectorizer returns the correct number of samples.
        X_train = pd.Series(["this is a test", "another test email"])
        X_val = pd.Series(["test email"])
        tfidf, X_train_tfidf, X_val_tfidf = vectorize_text(X_train, X_val)
        self.assertEqual(X_train_tfidf.shape[0], 2)
        self.assertEqual(X_val_tfidf.shape[0], 1)


# ---------------------------
# Main Execution
# ---------------------------

if __name__ == '__main__':
    # Run unit tests if the script is called with "test" argument.
    if 'test' in sys.argv:
        sys.argv.remove('test')
        unittest.main()
    else:
        # Run the full training pipeline
        csv_file = 'emails.csv'
        model_path = os.path.join(os.path.dirname(__file__), 'model.pkl')
        vectorizer_path = os.path.join(os.path.dirname(__file__), 'tfidf.pkl')
        best_model, tfidf, metrics, best_params = train_model_pipeline(csv_file, model_path, vectorizer_path)
        print("Best Parameters:", best_params)
        print("Evaluation Metrics:", metrics)