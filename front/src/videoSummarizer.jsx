import React, { useState } from 'react';
import { FileVideo, FileText, Download, Globe, AlertCircle, Check, Loader } from 'lucide-react';

export default function VideoSummarizer() {
  const [file, setFile] = useState(null);
  const [pdfUrl, setPdfUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState('');
  const [translationLoading, setTranslationLoading] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // List of available languages for translation
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

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith('video/')) {
      setFile(droppedFile);
      setPdfUrl('');
      setError('');
      setSummary('');
    } else {
      setError('Please drop a valid video file');
    }
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
      // Send video file to backend for summarization
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
    <div className="min-h-screen bg-gradient-to-br from-[#FFF8F8] to-[#FFF0F0] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <div className="bg-white p-3 rounded-full shadow-lg">
              <FileVideo size={32} className="text-[#FE6059]" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-800 sm:text-4xl mb-2">
            Video Summarizer
          </h1>
          <div className="h-1 w-16 bg-gradient-to-r from-[#FE6059] to-rose-500 mx-auto rounded-full mb-4"></div>
          <p className="mt-3 text-lg text-gray-600 max-w-2xl mx-auto">
            Transform your videos into concise, readable summaries in multiple languages
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100 mb-8">
          {/* File Upload Area */}
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`transition-all duration-300 p-8 border-b border-gray-100 ${
              isDragging 
                ? 'bg-[#FE6059]/5 border-[#FE6059] border-dashed' 
                : 'hover:bg-gray-50'
            }`}
          >
            <div className="flex flex-col items-center justify-center text-center space-y-4">
              <div className={`p-4 rounded-full ${
                file 
                  ? 'bg-green-100 text-green-600' 
                  : 'bg-gray-100 text-gray-400'
              }`}>
                {file ? <Check size={28} /> : <FileVideo size={28} />}
              </div>
              
              <div className="space-y-1">
                <h3 className="text-lg font-medium text-gray-800">
                  {file ? "Video Ready" : "Upload your video file"}
                </h3>
                <p className="text-sm text-gray-500">
                  {file 
                    ? file.name
                    : "Drag and drop your file here, or click to select"
                  }
                </p>
                {file && (
                  <p className="text-xs text-gray-400">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                )}
              </div>
              
              <div className="flex space-x-4">
                <label className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#FE6059] hover:bg-[#FE6059]/90 cursor-pointer transform hover:-translate-y-0.5 transition-all duration-200">
                  <span>{file ? "Change Video" : "Select Video"}</span>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleFileChange}
                    className="sr-only"
                    disabled={loading}
                  />
                </label>
                
                {file && (
                  <button
                    onClick={() => setFile(null)}
                    className="px-4 py-2 border border-gray-200 rounded-md text-sm font-medium text-gray-500 hover:bg-gray-50 transition-all duration-200"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="p-6 bg-gray-50 flex justify-center">
            <button
              onClick={handleSubmit}
              disabled={loading || !file}
              className={`flex items-center justify-center px-8 py-3 rounded-lg shadow-md transition-all duration-300
                ${loading 
                  ? 'bg-gray-300 cursor-not-allowed text-gray-500' 
                  : !file
                    ? 'bg-gray-200 cursor-not-allowed text-gray-500'
                    : 'bg-gradient-to-r from-[#FE6059] to-rose-500 text-white hover:-translate-y-0.5 hover:shadow-lg'
                }`}
            >
              {loading ? (
                <>
                  <Loader size={20} className="mr-2 animate-spin" />
                  <span>Processing video...</span>
                </>
              ) : (
                <>
                  <FileText size={20} className="mr-2" />
                  <span>Generate Summary</span>
                </>
              )}
            </button>
          </div>
        </div>
        
        {/* Error Message */}
        {error && (
          <div className="mb-8 overflow-hidden rounded-lg shadow-md">
            <div className="flex items-center p-4 bg-red-50 border-l-4 border-red-500">
              <AlertCircle className="text-red-500 h-5 w-5 flex-shrink-0" />
              <p className="ml-3 text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}
        
        {/* Results Section */}
        {pdfUrl && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100 transition-all duration-300">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center mb-4">
                <div className="bg-green-100 p-2 rounded-full">
                  <Check size={20} className="text-green-600" />
                </div>
                <h2 className="ml-3 text-xl font-bold text-gray-800">
                  Summary Generated Successfully
                </h2>
              </div>
              
              <a 
                href={pdfUrl} 
                download="video_summary.pdf"
                className="flex items-center justify-center w-full sm:w-auto px-6 py-3 rounded-lg shadow-md bg-[#FE6059] text-white hover:bg-[#FE6059]/90 transition-all duration-300 hover:-translate-y-0.5"
              >
                <Download size={18} className="mr-2" />
                Download Original Summary
              </a>
            </div>
            
            {/* Translations Section */}
            <div className="p-6 bg-gray-50">
              <div className="flex items-center mb-4">
                <Globe size={20} className="text-gray-700" />
                <h3 className="ml-2 text-lg font-semibold text-gray-800">
                  Available Translations
                </h3>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {languages.slice(1).map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => handleDownloadTranslation(lang)}
                    disabled={translationLoading !== null}
                    className={`flex items-center justify-center px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300
                      ${translationLoading === lang.code
                        ? 'bg-gray-100 text-gray-500'
                        : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-[#FE6059]/30 hover:text-[#FE6059]'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {translationLoading === lang.code ? (
                      <>
                        <Loader size={16} className="mr-2 animate-spin" />
                        <span>Translating...</span>
                      </>
                    ) : (
                      <>
                        <Download size={16} className="mr-2" />
                        {lang.name}
                      </>
                    )}
                  </button>
                ))}
              </div>
              
              <p className="mt-4 text-xs text-gray-500 text-center">
                Translations are generated on demand and may take a few moments to process.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}