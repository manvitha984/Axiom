import React, { useState } from 'react';

export default function VideoSummarizer() {
  const [file, setFile] = useState(null);
  const [pdfUrl, setPdfUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState('');
  const [translationLoading, setTranslationLoading] = useState(null);

  // Available languages
  const languages = [
    { code: 'en', name: 'English (Original)' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
  ];

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setPdfUrl('');
    setError('');
    setSummary('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a video file.");
      return;
    }
    setLoading(true);
    setError('');
    setSummary('');
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch("http://localhost:5000/videosummarizer", {
        method: "POST",
        body: formData,
        timeout: 60000
      });
      
      if (!response.ok) {
        throw new Error("Failed to generate summary. " + response.statusText);
      }
      
      // Store the original PDF blob
      const blob = await response.blob();
      
      // Create URL for download
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      
      // Get the summary text for translation
      const textResponse = await fetch("http://localhost:5000/extract_summary_text", {
        method: "POST",
        body: formData,
      });
      
      if (textResponse.ok) {
        const data = await textResponse.json();
        if (data.text) {
          setSummary(data.text);
        }
      }
      
    } catch (err) {
      setError(err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTranslation = async (language) => {
    if (!summary) {
      setError("No summary text available for translation");
      return;
    }
    
    setTranslationLoading(language.code);
    setError('');
    
    try {
      const response = await fetch("http://localhost:5000/translate_summary", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: summary,
          language: language.code
        })
      });
      
      if (!response.ok) {
        throw new Error(`Translation failed: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      // Create a temporary link and click it to download
      const a = document.createElement('a');
      a.href = url;
      a.download = `video_summary_${language.name}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
    } catch (err) {
      setError(`Translation error: ${err.message}`);
      console.error(err);
    } finally {
      setTranslationLoading(null);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Video Summarizer</h1>
      
      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
        <form onSubmit={handleSubmit} className="mb-4">
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Select a video file:
            </label>
            <input 
              type="file" 
              accept="video/*" 
              onChange={handleFileChange} 
              className="shadow border rounded w-full py-2 px-3 text-gray-700 mb-3"
              disabled={loading}
            />
          </div>
          <button 
            type="submit" 
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            disabled={loading || !file}
          >
            {loading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : "Generate Summary"}
          </button>
        </form>
      </div>
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
          <p>{error}</p>
        </div>
      )}
      
      {pdfUrl && (
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-800">Summary Generated!</h2>
          
          <div className="mb-8">
            <a 
              href={pdfUrl} 
              download="video_summary.pdf"
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded inline-flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
              </svg>
              Download Original PDF
            </a>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-3 text-gray-700">Download in other languages:</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {languages.slice(1).map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleDownloadTranslation(lang)}
                  disabled={translationLoading !== null || !summary}
                  className="bg-blue-100 hover:bg-blue-200 text-blue-800 font-medium py-2 px-4 rounded text-sm disabled:opacity-50 transition-colors"
                >
                  {translationLoading === lang.code ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {lang.name}
                    </span>
                  ) : lang.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}