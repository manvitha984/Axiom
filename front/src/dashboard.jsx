import { useState, useEffect } from "react";
import { fetchIncomingEmails } from "./services/emailService";
import { Search, Filter, RefreshCw, Mail, AlertCircle, Download } from "lucide-react";
import { jsPDF } from "jspdf";

export default function Dashboard() {
    const [incomingEmails, setIncomingEmails] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [frustrationSummary, setFrustrationSummary] = useState("");
    const [filter, setFilter] = useState("all");
    const [search, setSearch] = useState("");
    const [invertedIndex, setInvertedIndex] = useState({});
    useEffect(() => {
        const storedEmails = localStorage.getItem("emails");
        const storedSummary = localStorage.getItem("frustrationSummary");

        if (storedEmails && storedSummary) {
            const emails = JSON.parse(storedEmails);
            setIncomingEmails(emails);
            setFrustrationSummary(storedSummary);
            const index = buildInvertedIndex(emails);
            setInvertedIndex(index);
            console.log("Inverted Index: ",index);
        } else {
            handleRefresh();
        }
    }, []);

    const handleRefresh = async () => {
        try {
            setLoading(true);
            const data = await fetchIncomingEmails();
            setIncomingEmails(data.emails);
            setFrustrationSummary(data.frustrationSummary);

            localStorage.setItem("emails", JSON.stringify(data.emails));
            localStorage.setItem("frustrationSummary", data.frustrationSummary);

            const index = buildInvertedIndex(data.emails);
            setInvertedIndex(index);

            setError(null);
        } catch (err) {
            setError("Failed to fetch emails. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadSummary = () => {
        try {
            const doc = new jsPDF();
            
            // Add title
            doc.setFontSize(20);
            doc.setTextColor(33, 33, 33);
            doc.text("Email Frustration Analysis Summary", 20, 20);
            
            // Add date
            doc.setFontSize(12);
            doc.setTextColor(100, 100, 100);
            doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 30);
            
            // Add summary text
            doc.setFontSize(12);
            doc.setTextColor(33, 33, 33);
            
            // Split text into lines to fit page width
            const splitText = doc.splitTextToSize(frustrationSummary, 170);
            doc.text(splitText, 20, 40);
            
            // Add statistics
            const statsY = 40 + splitText.length * 7 + 10;
            doc.setFontSize(14);
            doc.text("Statistics:", 20, statsY);
            doc.setFontSize(12);
            doc.text(`Total emails analyzed: ${totalEmails}`, 20, statsY + 10);
            doc.text(`Frustrated emails: ${frustratedCount} (${frustratedPercentage.toFixed(1)}%)`, 20, statsY + 20);
            doc.text(`Non-frustrated emails: ${nonFrustratedCount} (${nonFrustratedPercentage.toFixed(1)}%)`, 20, statsY + 30);
            
            // Save the PDF
            doc.save("frustration-summary.pdf");
        } catch (err) {
            console.error("Error generating PDF:", err);
            alert("Failed to generate PDF. Please try again.");
        }
    };

    const tokenize = (text) => {
        return text.toLowerCase().split(/\s+/).filter(Boolean);
    };

    const buildInvertedIndex = (emails) => {
        const index = {};
        emails.forEach((email, idx) => {
            const fields = [email.subject, email.from, email.body];
            fields.forEach((field) => {
                if (field) {
                    const tokens = tokenize(field);
                    tokens.forEach((token) => {
                        if (!index[token]) {
                            index[token] = new Set();
                        }
                        index[token].add(idx);
                    });
                }
            });
        });
        return index;
    };

    const searchEmails = (query) => {
        if (!query) return incomingEmails;
        const words = query.toLowerCase().split(/\s+/);
        let resultIndices = new Set();
    
        words.forEach((word, i) => {
            const matchingKeys = Object.keys(invertedIndex).filter(key => key.startsWith(word));
            let matchingIndices = new Set();
            
            matchingKeys.forEach(matchingWord => {
                invertedIndex[matchingWord].forEach(index => matchingIndices.add(index));
            });
    
            if (i === 0) {
                resultIndices = matchingIndices;
            } else {
                resultIndices = new Set([...resultIndices].filter(x => matchingIndices.has(x)));
            }
        });
    
        return [...resultIndices].map(i => incomingEmails[i]);
    };
    
    const totalEmails = incomingEmails.length;
    const frustratedCount = incomingEmails.filter(email => email.is_frustrated).length;
    const nonFrustratedCount = totalEmails - frustratedCount;
    const frustratedPercentage = totalEmails ? (frustratedCount / totalEmails) * 100 : 0;
    const nonFrustratedPercentage = totalEmails ? (nonFrustratedCount / totalEmails) * 100 : 0;

    const filteredEmails = searchEmails(search).filter((email) => {
        return filter === "all" ||
            (filter === "frustrated" && email.is_frustrated) ||
            (filter === "not-frustrated" && !email.is_frustrated);
    });

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#FFF8F8] to-[#FFF0F0] p-6 md:p-8">
            {/* Header Section */}
            <header className="bg-white rounded-2xl shadow-md p-5 mb-6 flex justify-between items-center">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center">
                    <Mail className="mr-2 text-[#FE6059]" />
                    Email Analysis Dashboard
                </h1>
                <button 
                    onClick={handleRefresh} 
                    className="px-4 py-2 bg-[#FE6059] text-white rounded-lg hover:bg-red-600 transition-colors duration-300 flex items-center shadow-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50" 
                    disabled={loading}
                >
                    <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    {loading ? "Refreshing..." : "Refresh Emails"}
                </button>
            </header>

            {/* Loading and Error States */}
            {loading && (
                <div className="flex justify-center items-center p-6 mb-6 bg-white rounded-xl shadow-md">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#FE6059] mr-3"></div>
                    <p className="text-gray-600 font-medium">Loading emails...</p>
                </div>
            )}
            
            {error && (
                <div className="flex items-center p-4 mb-6 bg-white rounded-xl shadow-md border-l-4 border-red-500">
                    <AlertCircle className="text-red-500 mr-3" />
                    <p className="text-red-600">{error}</p>
                </div>
            )}

            {/* Frustration Summary Card */}
            {frustrationSummary && !loading && (
                <div className="mb-6 p-6 bg-white rounded-xl shadow-md border-l-4 border-red-500 transform transition-all hover:shadow-lg">
                    <div className="flex justify-between items-center mb-3">
                        <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                            <span className="mr-2">📊</span>
                            Frustration Summary
                        </h2>
                        <button 
                            onClick={handleDownloadSummary}
                            className="flex items-center px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-gray-300"
                        >
                            <Download size={16} className="mr-2" />
                            <span className="text-sm font-medium">Download PDF</span>
                        </button>
                    </div>
                    <p className="text-gray-700 mb-4 leading-relaxed">{frustrationSummary}</p>
                    
                    <div className="bg-gray-100 p-4 rounded-lg">
                        <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium text-green-600">Not Frustrated</span>
                            <span className="text-sm font-medium text-red-600">Frustrated</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-4 relative overflow-hidden">
                            <div 
                                className="absolute left-0 top-0 h-full bg-gradient-to-r from-green-400 to-green-500 transition-all duration-500" 
                                style={{ width: `${nonFrustratedPercentage}%` }}
                            ></div>
                            <div 
                                className="absolute right-0 top-0 h-full bg-gradient-to-l from-red-400 to-red-500 transition-all duration-500" 
                                style={{ width: `${frustratedPercentage}%` }}
                            ></div>
                        </div>
                        <div className="flex justify-between mt-2">
                            <span className="text-sm font-medium text-green-700">{nonFrustratedPercentage.toFixed(1)}%</span>
                            <span className="text-sm font-medium text-red-700">{frustratedPercentage.toFixed(1)}%</span>
                        </div>
                        
                        <div className="mt-3 text-center">
                            <span className="px-3 py-1 text-sm rounded-full bg-gray-200 text-gray-700">
                                Total emails analyzed: {totalEmails}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Search and Filter Bar */}
            <div className="flex flex-col md:flex-row gap-4 bg-white p-5 rounded-xl shadow-md mb-6">
                <div className="relative md:w-1/3">
                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <select
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-[#FE6059] focus:border-transparent transition-all outline-none cursor-pointer"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    >
                        <option value="all">📩 All Emails</option>
                        <option value="frustrated">😡 Frustrated Emails</option>
                        <option value="not-frustrated">😊 Not Frustrated Emails</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </div>
                <div className="relative flex items-center flex-grow">
                    <Search className="absolute left-3 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search in emails..."
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#FE6059] focus:border-transparent transition-all outline-none"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Email List */}
            <div className="space-y-4">
                {filteredEmails.length > 0 ? (
                    filteredEmails.map((email, index) => (
                        <div 
                            key={index} 
                            className="bg-white rounded-xl shadow-md overflow-hidden transition-all hover:shadow-lg border-l-4 border-transparent hover:border-l-4 hover:border-gray-300"
                        >
                            <div className="p-5">
                                <div className="flex justify-between items-center mb-3">
                                    <h2 className="text-xl font-semibold text-gray-800">{email.subject}</h2>
                                    <div 
                                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                                            email.is_frustrated 
                                                ? "bg-red-100 text-red-700" 
                                                : "bg-green-100 text-green-700"
                                        }`}
                                    >
                                        {email.is_frustrated ? "Frustrated" : "Not Frustrated"}
                                    </div>
                                </div>
                                <p className="text-gray-600 mb-3 text-sm">From: <span className="font-medium">{email.from}</span></p>
                                <div className="p-4 bg-gray-50 rounded-lg mb-3">
                                    <p className="text-gray-700 whitespace-pre-line">{email.body}</p>
                                </div>
                                <div className={`p-3 rounded-lg ${
                                    email.is_frustrated ? "bg-red-50 border border-red-100" : "bg-green-50 border border-green-100"
                                }`}>
                                    <h3 className="font-medium mb-1">Frustration Analysis</h3>
                                    <div className="flex items-center">
                                        <span className="text-2xl mr-2">
                                            {email.is_frustrated ? "😡" : "😊"}
                                        </span>
                                        <p className={`font-medium ${
                                            email.is_frustrated ? "text-red-600" : "text-green-600"
                                        }`}>
                                            {email.is_frustrated ? "Customer appears frustrated" : "Customer appears satisfied"}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="bg-white rounded-xl shadow-md p-10 text-center">
                        <div className="flex justify-center mb-4">
                            <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <p className="text-gray-500 text-lg">No emails found matching your criteria.</p>
                        <p className="text-gray-400 mt-2">Try adjusting your search or filters.</p>
                    </div>
                )}
            </div>
        </div>
    );
}