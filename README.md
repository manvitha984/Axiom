# Axiom

## Overview
This project automates various business processes using AI, reducing manual effort and improving efficiency. The system integrates multiple features including document processing, email analysis, video summarization, and a chatbot for customer service.

## Features

### 📄 Document Processing & Conversion
- Automatically extracts PDF invoices from emails (using a subject filter) and converts them into Excel spreadsheets.
- Allows users to upload files for data extraction.
- Selectively retrieves specific data fields from PDFs.

🔹 **Technologies Used**: Google Gmail API, PyPDF2, Camelot, ReportLab

### 🎥 Video Summarization
- Generates bullet points and summary documents from video content.
- Uses NLP techniques to extract key points and summarize.

🔹 **Technologies Used**: AV, Whisper, Soundfile, Librosa, NLTK, Scikit-learn, Google Generative AI (Gemini)

### 📧 Email Analysis & Negative Review Detection
- Retrieves and analyzes organization-wide emails to flag negative or frustrated messages.
- Uses a scoring model combined with Google Generative AI for accurate sentiment detection.

🔹 **Technologies Used**: Google Gmail API, Logistic Regression, Ensemble Learning, Gemini AI

### 🤖 Chatbot Integration
- Provides a conversational AI interface to assist with product-related queries and customer service.

🔹 **Technologies Used**: Google Generative AI (Gemini)

## Implementation Details

### Technologies Used
- **Backend**: Node.js (Express.js), Firebase
- **AI Models**: Custom-trained logistic regression model, TF-IDF vectorization, Google Gemini API
- **Data Processing**: Pandas, NumPy, PyPDF2, Whisper
- **Cloud Services**: Google Cloud, Firebase Authentication, AWS/Azure (for future scalability)

### Design Approach
- Emails are fetched via the Gmail API and processed in real-time.
- AI models analyze sentiment and extract key information.
- Document conversion utilizes OCR and text extraction libraries.
- Video summarization processes audio and text using NLP techniques.
- The chatbot responds using pre-trained and fine-tuned AI models.

### Scaling Considerations
- Can handle high email volumes efficiently.
- Designed to process long-form video transcriptions with improved summarization capabilities.
- Supports real-time document conversion for large datasets.

## Future Enhancements
- Automated email responses for frequently asked queries.
- Expanding video processing to handle longer durations effectively.
- Tracking organizational expenses by categorizing invoice data.
- Analyzing sentiment trends over time for deeper insights.
- Exploring BERT-based models if GPU resources allow.

## Installation & Usage

### Prerequisites
- Node.js & npm installed
- Google API keys configured (.env file required)

### Setup
```sh
### Clone the repository
git clone https://github.com/your-repo.git
cd your-repo

### Navigate to the frontend and install dependencies
cd frontend

npm install

npm run dev

### Navigate to the backend and install dependencies
cd ../backend

npm install
### Run the backend server
python server.py
```




### Add necessary credentials  
### 1. credentials.json - Add the required details  
### 2. .env - Add the Gemini API key  
### 3. firebase-config.js - Add Firebase credentials  
### 4. serviceAccountKey.json - Add the Firebase service account key  


# Demo:
https://drive.google.com/file/d/1DOP9mGKBkDkzn1UlFG47bkVxw0bkx4Wh/view?usp=sharing