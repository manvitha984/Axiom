import React, { useState } from 'react';
import { FileText, Upload, Mail, Check, AlertCircle, Download, Loader } from 'lucide-react';

export default function InvoiceDataExtractor() {
  const [mode, setMode] = useState("upload"); // "upload" or "email"
  const [file, setFile] = useState(null);
  const [columns, setColumns] = useState([]);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const handleModeChange = (newMode) => {
    setMode(newMode);
    // Reset state when switching mode
    setFile(null);
    setColumns([]);
    setSelectedColumns([]);
    setError('');
    setSuccess('');
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setColumns([]);
    setSelectedColumns([]);
    setError('');
    setSuccess('');
  };

  const handleGetColumns = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    const formData = new FormData();
    // Use action based on mode
    formData.append('action', mode === 'upload' ? 'get_columns' : 'read_emails');
    if (mode === 'upload') {
      if (!file) {
        setError("Please select a PDF file first.");
        setLoading(false);
        return;
      }
      formData.append('file', file);
    }
    try {
      const response = await fetch("http://localhost:5000/extract_invoice_data", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        throw new Error("Failed to extract columns. " + response.statusText);
      }
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      setColumns(data.columns);
      setSelectedColumns(data.columns); // select all by default
      setSuccess("Columns loaded successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckboxChange = (e) => {
    const { value, checked } = e.target;
    if (checked) {
      setSelectedColumns(prev => [...prev, value]);
    } else {
      setSelectedColumns(prev => prev.filter(col => col !== value));
    }
  };

  const handleSelectAll = () => {
    setSelectedColumns([...columns]);
  };

  const handleSelectNone = () => {
    setSelectedColumns([]);
  };

  const handleExtractSelectedColumns = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    const formData = new FormData();
    formData.append('action', mode === 'upload' ? 'extract_data' : 'read_emails');
    if (mode === 'upload') {
      if (!file) {
        setError("Please select a PDF file.");
        setLoading(false);
        return;
      }
      formData.append('file', file);
    }
    if (!selectedColumns.length) {
      setError("Please select at least one column.");
      setLoading(false);
      return;
    }
    formData.append('columns', JSON.stringify(selectedColumns));

    try {
      const response = await fetch("http://localhost:5000/extract_invoice_data", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        throw new Error("Failed to extract data. " + response.statusText);
      }
      // If the response is JSON (error message), throw error
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const jsonData = await response.json();
        if (jsonData.error) throw new Error(jsonData.error);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = mode === 'upload' ? 'extracted_data.xlsx' : 'extracted_data_from_email.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setSuccess("Data extracted successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
    if (droppedFile && droppedFile.type === 'application/pdf') {
      setFile(droppedFile);
      setColumns([]);
      setSelectedColumns([]);
      setError('');
      setSuccess('');
    } else {
      setError('Please drop a PDF file');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF8F8] to-[#FFF0F0] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <div className="bg-white p-3 rounded-full shadow-lg">
              <FileText size={32} className="text-[#FE6059]" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-800 sm:text-4xl mb-2">
            Invoice Data Extractor
          </h1>
          <div className="h-1 w-16 bg-gradient-to-r from-[#FE6059] to-rose-500 mx-auto rounded-full mb-4"></div>
          <p className="mt-3 text-lg text-gray-600 max-w-2xl mx-auto">
            {mode === 'upload' 
              ? "Upload your invoice PDF and extract specific data columns with ease" 
              : "Extract invoice data directly from your emails in just a few clicks"}
          </p>
        </div>

        {/* Mode Toggle Section */}
        <div className="bg-white rounded-xl shadow-lg p-1.5 flex w-full max-w-md mx-auto mb-8">
          <button
            onClick={() => handleModeChange("upload")}
            className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg transition-all duration-300 ${
              mode === "upload"
                ? 'bg-[#FE6059] text-white shadow-md'
                : 'bg-transparent text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Upload size={18} />
            <span>Upload PDF</span>
          </button>
          <button
            onClick={() => handleModeChange("email")}
            className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg transition-all duration-300 ${
              mode === "email"
                ? 'bg-[#FE6059] text-white shadow-md'
                : 'bg-transparent text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Mail size={18} />
            <span>From Emails</span>
          </button>
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
          {/* File Upload Area */}
          {mode === 'upload' && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`p-8 transition-all duration-300 border-b border-gray-100 ${
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
                  {file ? <Check size={28} /> : <Upload size={28} />}
                </div>
                
                <div className="space-y-1">
                  <h3 className="text-lg font-medium text-gray-800">
                    {file ? "File Ready" : "Upload your PDF invoice"}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {file 
                      ? file.name
                      : "Drag and drop your file here, or click to select"
                    }
                  </p>
                </div>
                
                {!file && (
                  <label className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#FE6059] hover:bg-[#FE6059]/90 cursor-pointer transform hover:-translate-y-0.5 transition-all duration-200">
                    <span>Select File</span>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={handleFileChange}
                      className="sr-only"
                    />
                  </label>
                )}

                {file && (
                  <button
                    onClick={() => setFile(null)}
                    className="text-sm text-gray-500 hover:text-[#FE6059] transition-colors"
                  >
                    Remove file
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Actions Section */}
          <div className="p-8 border-b border-gray-100">
            <h3 className="text-lg font-medium text-gray-800 mb-4">
              {columns.length > 0 ? "Select Columns to Extract" : "Get Available Columns"}
            </h3>
            
            {columns.length === 0 && (
              <div className="flex justify-center">
                <button
                  onClick={handleGetColumns}
                  disabled={loading || (mode === 'upload' && !file)}
                  className={`flex items-center justify-center px-6 py-3 rounded-lg shadow-md transition-all duration-200
                    ${loading 
                      ? 'bg-gray-300 cursor-not-allowed text-gray-500' 
                      : 'bg-gradient-to-r from-[#FE6059] to-rose-500 text-white hover:-translate-y-0.5 hover:shadow-lg'
                    }
                    ${mode === 'upload' && !file ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  {loading 
                    ? <><Loader size={18} className="mr-2 animate-spin" /> Processing...</> 
                    : (mode === 'upload' 
                      ? <><FileText size={18} className="mr-2" /> Get Columns from File</> 
                      : <><Mail size={18} className="mr-2" /> Fetch Emails</>
                    )
                  }
                </button>
              </div>
            )}

            {/* Column Selection */}
            {columns.length > 0 && (
              <div>
                <div className="flex justify-between mb-4">
                  <div className="flex items-center text-sm">
                    <span className="text-gray-600 mr-2">Selected:</span>
                    <span className="font-medium text-gray-800">{selectedColumns.length} of {columns.length}</span>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={handleSelectAll}
                      className="text-xs px-3 py-1 border border-gray-200 rounded-md hover:bg-gray-50 text-gray-600 transition-colors"
                    >
                      Select All
                    </button>
                    <button
                      onClick={handleSelectNone}
                      className="text-xs px-3 py-1 border border-gray-200 rounded-md hover:bg-gray-50 text-gray-600 transition-colors"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {columns.map((col, index) => (
                    <label 
                      key={index} 
                      className={`flex items-center p-2.5 rounded-lg border ${
                        selectedColumns.includes(col) 
                          ? 'bg-[#FE6059]/5 border-[#FE6059]/30' 
                          : 'border-gray-200 hover:border-gray-300'
                      } transition-colors cursor-pointer`}
                    >
                      <input
                        type="checkbox"
                        value={col}
                        checked={selectedColumns.includes(col)}
                        onChange={handleCheckboxChange}
                        className="h-4 w-4 text-[#FE6059] rounded border-gray-300 focus:ring-[#FE6059]"
                      />
                      <span className="text-sm ml-2 text-gray-700 truncate" title={col}>
                        {col}
                      </span>
                    </label>
                  ))}
                </div>
                
                <div className="flex justify-center mt-6">
                  <button
                    onClick={handleExtractSelectedColumns}
                    disabled={loading || selectedColumns.length === 0}
                    className={`flex items-center justify-center px-6 py-3 rounded-lg shadow-md transition-all duration-200
                      ${loading 
                        ? 'bg-gray-300 cursor-not-allowed text-gray-500' 
                        : selectedColumns.length === 0
                          ? 'opacity-50 cursor-not-allowed bg-gray-400 text-white'
                          : 'bg-gradient-to-r from-[#FE6059] to-rose-500 text-white hover:-translate-y-0.5 hover:shadow-lg'
                      }
                    `}
                  >
                    {loading 
                      ? <><Loader size={18} className="mr-2 animate-spin" /> Processing...</> 
                      : <><Download size={18} className="mr-2" /> Extract Selected Data</>
                    }
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Status Messages */}
          <div className="px-8 py-4 bg-gray-50">
            {error && (
              <div className="flex items-start p-4 rounded-lg bg-red-50 border border-red-100">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-red-800">Error</h4>
                  <p className="mt-1 text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}
            
            {success && (
              <div className="flex items-start p-4 rounded-lg bg-green-50 border border-green-100">
                <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-green-800">Success</h4>
                  <p className="mt-1 text-sm text-green-700">{success}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}