import os
import pandas as pd
import re
import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, precision_recall_fscore_support
import pickle

nltk.download('stopwords')
nltk.download('wordnet')

# Load the dataset (assumes emails.csv is placed in the same directory or update the path)
df = pd.read_csv('emails.csv')
df['label'] = df['label'].astype(int)

def preprocess_text(text):
    text = re.sub(r'<.*?>|http\S+|[^a-zA-Z\s]', '', text)  # Remove HTML tags, URLs, special characters
    tokens = text.lower().split()
    lemmatizer = WordNetLemmatizer()
    tokens = [lemmatizer.lemmatize(word) for word in tokens if word not in stopwords.words('english')]
    return ' '.join(tokens)

df['cleaned_text'] = df['text'].apply(preprocess_text)

X_train, X_val, y_train, y_val = train_test_split(df['cleaned_text'], df['label'], test_size=0.2, random_state=42)
tfidf = TfidfVectorizer(max_features=1000, ngram_range=(1, 2))
X_train_tfidf = tfidf.fit_transform(X_train)
X_val_tfidf = tfidf.transform(X_val)

model = LogisticRegression(class_weight='balanced', max_iter=1000)
cross_val_scores = cross_val_score(model, X_train_tfidf, y_train, cv=5)
print(f'Cross-validation scores: {cross_val_scores}')
print(f'Mean cross-validation score: {cross_val_scores.mean()}')

model.fit(X_train_tfidf, y_train)
y_pred = model.predict(X_val_tfidf)
accuracy = accuracy_score(y_val, y_pred)
precision, recall, f1, _ = precision_recall_fscore_support(y_val, y_pred, average='binary')
print(f'Accuracy: {accuracy}')
print(f'Precision: {precision}')
print(f'Recall: {recall}')
print(f'F1-score: {f1}')

# Save the trained model and vectorizer
with open('model.pkl', 'wb') as f:
    pickle.dump(model, f)
with open('tfidf.pkl', 'wb') as f:
    pickle.dump(tfidf, f)