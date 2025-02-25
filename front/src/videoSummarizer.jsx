import React, { useState } from 'react';

export default function VideoSummarizer() {
  const [file, setFile] = useState(null);
  const [pdfUrl, setPdfUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setPdfUrl('');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a video file.");
      return;
    }
    setLoading(true);
    setError('');
    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch("http://localhost:5000/videosummarizer", {
            method: "POST",
            body: formData,
          });
      if (!response.ok) {
        throw new Error("Failed to generate summary. " + response.statusText);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
    } catch (err) {
      setError(err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Video Summarizer</h1>
      <form onSubmit={handleSubmit} className="mb-4">
        <input 
          type="file" 
          accept="video/*" 
          onChange={handleFileChange} 
          className="border p-2 mb-2"
        />
        <br />
        <button 
          type="submit" 
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
        >
          {loading ? "Processing..." : "Generate Summary"}
        </button>
      </form>
      {error && <p className="text-red-600">{error}</p>}
      {pdfUrl && (
        <div>
          <a href={pdfUrl} download="video_transcription.pdf">
            <button className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded">
              Summary Generated - Download PDF
            </button>
          </a>
        </div>
      )}
    </div>
  );
}