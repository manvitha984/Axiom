import React, { useState } from 'react';

export default function InvoiceDataExtractor() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a PDF file.");
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('action', 'upload');

    try {
      const response = await fetch("http://localhost:5000/extract_invoice_data", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        throw new Error("Failed to extract data. " + response.statusText);
      }
      const blob = await response.blob();
      // If the response is HTML (no mails found), display it instead of downloading
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("text/html")) {
        const htmlMessage = await blob.text();
        setSuccess(htmlMessage);
      } else {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'extracted_names.xlsx';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setSuccess("Data extracted successfully.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReadEmails = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    const formData = new FormData();
    formData.append('action', 'read_emails');
  
    try {
      const response = await fetch("http://localhost:5000/extract_invoice_data", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        throw new Error("Failed to extract data from emails. " + response.statusText);
      }
      // Since the response is an Excel file (binary format), parse it as a blob.
      const blob = await response.blob();
      // Create a URL for the blob
      const url = window.URL.createObjectURL(blob);
      // Create an anchor element and simulate a click to trigger the download.
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = 'extracted_names.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      setSuccess("Excel file downloaded.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Invoice Data Extractor</h1>
      <form onSubmit={handleSubmit} className="mb-4">
        <input 
          type="file" 
          accept="application/pdf" 
          onChange={handleFileChange} 
          className="border p-2 mb-2"
        />
        <br />
        <button 
          type="submit" 
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
        >
          {loading ? "Processing..." : "Extract Data"}
        </button>
      </form>
      <button 
        onClick={handleReadEmails} 
        className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
      >
        {loading ? "Processing..." : "Extract Data from Emails"}
      </button>
      {error && <p className="text-red-600 mt-4" dangerouslySetInnerHTML={{ __html: error }}></p>}
      {success && <div className="text-green-600 mt-4" dangerouslySetInnerHTML={{ __html: success }}></div>}
    </div>
  );
}