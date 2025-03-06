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
    <div className="min-h-screen bg-[#FFF8F8] py-0 px-4 sm:px-6 lg:px-8">
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#FE6059] to-red-500 mb-2">
          Video Summarizer
        </h1>
        <p className="text-lg text-gray-600">Transform your videos into concise summaries</p>
      </div>
      
        <div className="bg-white shadow-xl rounded-2xl p-8 mb-8 border border-[#FE6059]/10">
          <form onSubmit={handleSubmit} className="mb-4">
            <div className="mb-6">
              <label className="block text-gray-700 text-lg font-semibold mb-3">
                Select your video file
              </label>
              <input 
                type="file" 
                accept="video/*" 
                onChange={handleFileChange} 
                className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0
                  file:text-sm file:font-semibold file:bg-[#FE6059]/10 file:text-[#FE6059]
                  hover:file:bg-[#FE6059]/20 w-full py-2 px-3 text-gray-700
                  rounded-lg border-2 border-gray-200 hover:border-[#FE6059]/50
                  focus:outline-none transition duration-200"
                disabled={loading}
              />
            </div>
            <button 
              type="submit" 
              className={`w-full sm:w-auto px-6 py-3 rounded-lg shadow-lg
                ${loading || !file 
                  ? 'bg-gray-300 cursor-not-allowed' 
                  : 'bg-[#FE6059] hover:bg-[#FE6059]/90 transform hover:-translate-y-0.5'
                }
                text-white font-semibold text-lg transition duration-200 ease-in-out`}
              disabled={loading || !file}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing your video...
                </span>
              ) : "Generate Summary"}
            </button>
          </form>
        </div>
      
        {error && (
          <div className="bg-red-50 border-l-4 border-[#FE6059] rounded-lg p-6 mb-6 shadow-md" role="alert">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-[#FE6059]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-[#FE6059] font-medium">{error}</p>
              </div>
            </div>
          </div>
        )}
      
        {pdfUrl && (
          <div className="bg-white shadow-xl rounded-2xl p-8 border border-[#FE6059]/10">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center">
              <svg className="w-6 h-6 text-[#FE6059] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Summary Generated Successfully!
            </h2>
          
            <div className="mb-8">
              <a 
                href={pdfUrl} 
                download="video_summary.pdf"
                className="inline-flex items-center px-6 py-3 rounded-lg shadow-lg bg-[#FE6059] hover:bg-[#FE6059]/90 text-white font-semibold text-lg transition duration-200 ease-in-out transform hover:-translate-y-0.5"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                </svg>
                Download Original Summary
              </a>
            </div>
          
            <div>
              <h3 className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">
                Available Translations
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {languages.slice(1).map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => handleDownloadTranslation(lang)}
                    disabled={translationLoading !== null || !summary}
                    className={`px-4 py-3 rounded-lg font-medium text-sm transition duration-200 ease-in-out
                      ${translationLoading === lang.code
                        ? 'bg-[#FE6059]/10 text-[#FE6059]'
                        : 'bg-white border-2 border-[#FE6059]/20 text-[#FE6059] hover:bg-[#FE6059]/5 hover:border-[#FE6059]/30'
                      } disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md`}
                  >
                    {translationLoading === lang.code ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
    </div>
  );
  
}