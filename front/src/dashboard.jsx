import { useState, useEffect } from "react";
import { fetchIncomingEmails } from "./services/emailService";

export default function Dashboard() {
    const [incomingEmails, setIncomingEmails] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchEmails = async () => {
            try {
                setLoading(true);
                const emails = await fetchIncomingEmails();
                setIncomingEmails(emails);
                setError(null);
            } catch (err) {
                setError("Failed to fetch emails.");
                console.error("Failed to fetch emails:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchEmails();
    }, []);

    const formatScore = (score) => {
        return typeof score === 'number' ? `${(score * 100).toFixed(1)}%` : 'N/A';
    };

    return (
        <div className="min-h-screen bg-[#FFF8F8] p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Email Analysis</h1>
            {loading && <div>Loading...</div>}
            {error && <div className="text-red-500">{error}</div>}
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
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h3 className="font-semibold mb-2">Frustration Analysis</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p>Custom Model: {formatScore(email.score_custom)}</p>
                                    <p>Gemini API: {formatScore(email.score_gemini)}</p>
                                    <p>Combined Score: {formatScore(email.combined_score)}</p>
                                </div>
                                <div className="text-right">
                                    <p className={`font-bold ${email.is_frustrated ? 'text-red-600' : 'text-green-600'}`}>
                                        {email.is_frustrated ? 'Frustrated' : 'Not Frustrated'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}