import { useState, useEffect } from "react";
import { fetchIncomingEmails } from "./services/emailService";

export default function Dashboard() {
    const [incomingEmails, setIncomingEmails] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [frustrationSummary, setFrustrationSummary] = useState("");

    useEffect(() => {
        // Load from localStorage on initial mount
        const storedEmails = localStorage.getItem('emails');
        const storedSummary = localStorage.getItem('frustrationSummary');
        
        if (storedEmails && storedSummary) {
            setIncomingEmails(JSON.parse(storedEmails));
            setFrustrationSummary(storedSummary);
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
            
            // Store in localStorage
            localStorage.setItem('emails', JSON.stringify(data.emails));
            localStorage.setItem('frustrationSummary', data.frustrationSummary);
            
            setError(null);
        } catch (err) {
            setError("Failed to fetch emails. Please try again.");
            console.error("Fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FFF8F8] p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Email Analysis</h1>
                <button 
                    onClick={handleRefresh}
                    className="px-4 py-2 bg-[#FE6059] text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    disabled={loading}
                >
                    {loading ? 'Refreshing...' : 'Refresh Emails'}
                </button>
            </div>
            {loading && <div>Loading...</div>}
            {error && <div className="text-red-500">{error}</div>}
            {frustrationSummary && (
                <div className="mb-6 p-6 bg-white rounded-lg shadow-lg border-l-4 border-red-500">
                    <h2 className="text-xl font-semibold text-gray-900">Frustration Summary</h2>
                    <p className="text-gray-700">{frustrationSummary}</p>
                </div>
            )}
            <div className="space-y-4">
                {incomingEmails.map((email, index) => (
                    <div key={index} className="bg-white rounded-lg shadow p-6">
                        <div className="mb-4">
                            <h2 className="text-xl font-semibold">{email.subject}</h2>
                            <p className="text-gray-600">From: {email.from}</p>
                            <p className="text-gray-600">Date: {email.date}</p>
                        </div>
                        <div className="mb-4">
                            <p className="text-gray-700">{email.body}</p>
                        </div>
                        <div className={`p-4 rounded-lg ${email.is_frustrated ? 'bg-red-100' : 'bg-green-100'}`}>
                            <h3 className="font-semibold">Frustration Analysis</h3>
                            <p className={`text-lg font-bold ${email.is_frustrated ? 'text-red-600' : 'text-green-600'}`}>
                                {email.is_frustrated ? 'Frustrated' : 'Not Frustrated'}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}