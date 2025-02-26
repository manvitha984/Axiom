import os
import pandas as pd
import re
import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, precision_recall_fscore_support
import pickle

# Download required NLTK resources
nltk.download('stopwords')
nltk.download('wordnet')

# Load the dataset (assumes emails.csv is in the same directory)
df = pd.read_csv('emails.csv')

# Display dataset columns
print("Dataset Columns:", df.columns.tolist())

# Remove rows with null values in 'text' or 'label'
df = df.dropna(subset=['text', 'label'])

# Convert label to integer type
df['label'] = df['label'].astype(int)

def preprocess_text(text):
    # Remove HTML tags, URLs, and special characters
    text = re.sub(r'<.*?>|http\S+|[^a-zA-Z\s]', '', text)
    tokens = text.lower().split()
    lemmatizer = WordNetLemmatizer()
    tokens = [lemmatizer.lemmatize(word) for word in tokens if word not in stopwords.words('english')]
    return ' '.join(tokens)

# Preprocess the text column
df['cleaned_text'] = df['text'].apply(preprocess_text)

# Remove rows where the cleaned text might be empty
df = df[df['cleaned_text'].str.strip() != '']

# Split data into training and validation sets
X_train, X_val, y_train, y_val = train_test_split(
    df['cleaned_text'], df['label'], test_size=0.2, random_state=42
)

# Convert text data into TF-IDF features
tfidf = TfidfVectorizer(max_features=1000, ngram_range=(1, 2))
X_train_tfidf = tfidf.fit_transform(X_train)
X_val_tfidf = tfidf.transform(X_val)

# Initialize Logistic Regression model with balanced class weights
model = LogisticRegression(class_weight='balanced', max_iter=1000)

# Define a parameter grid for hyperparameter tuning using GridSearchCV
param_grid = {
    'C': [0.01, 0.1, 1, 10, 100],
    'penalty': ['l2'],       # 'l1' can be used if a compatible solver is chosen (e.g., 'liblinear')
    'solver': ['lbfgs']      # You can experiment with other solvers like 'liblinear' if needed
}

# Set up GridSearchCV to find the best hyperparameters
grid_search = GridSearchCV(model, param_grid, cv=5, scoring='f1')
grid_search.fit(X_train_tfidf, y_train)
print("Best Parameters:", grid_search.best_params_)

# Get the best model from grid search
best_model = grid_search.best_estimator_

# Evaluate the best model using cross-validation
cv_scores = cross_val_score(best_model, X_train_tfidf, y_train, cv=5, scoring='f1')
print(f'Cross-validation scores: {cv_scores}')
print(f'Mean cross-validation score: {cv_scores.mean()}')

# Train the best model on the training set
best_model.fit(X_train_tfidf, y_train)

# Evaluate the model on the validation set
y_pred = best_model.predict(X_val_tfidf)
accuracy = accuracy_score(y_val, y_pred)
precision, recall, f1, _ = precision_recall_fscore_support(y_val, y_pred, average='binary')
print(f'Accuracy: {accuracy}')
print(f'Precision: {precision}')
print(f'Recall: {recall}')
print(f'F1-score: {f1}')

# Save the trained model and TF-IDF vectorizer using pickle
model_path = os.path.join(os.path.dirname(__file__), 'model.pkl')
vectorizer_path = os.path.join(os.path.dirname(__file__), 'tfidf.pkl')

with open(model_path, 'wb') as f:
    pickle.dump(best_model, f)
with open(vectorizer_path, 'wb') as f:
    pickle.dump(tfidf, f)
