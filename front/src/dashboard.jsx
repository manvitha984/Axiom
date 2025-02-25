import { useState, useEffect } from "react";
import { fetchIncomingEmails } from "./services/emailService";

export default function Dashboard() {
  const [incomingEmails, setIncomingEmails] = useState([]);

  useEffect(() => {
    const fetchEmails = async () => {
      try {
        const emails = await fetchIncomingEmails();
        setIncomingEmails(emails);
        console.log("Fetched incoming emails:", emails);
      } catch (err) {
        console.error("Failed to fetch emails:", err);
      }
    };

    fetchEmails();
  }, []);

  return (
    <div className="min-h-screen bg-[#FFF8F8] p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        Incoming Emails
      </h1>
      <ul className="space-y-2">
        {incomingEmails.length > 0 ? (
          incomingEmails.map((email, index) => (
            <li key={index} className="text-gray-600">
              <strong>From:</strong> {email.from} <br />
              <strong>Subject:</strong> {email.subject} <br />
              <strong>Date:</strong> {email.date} <br />
              <strong>Body:</strong> {email.body.substring(0, 100)}...
            </li>
          ))
        ) : (
          <li className="text-gray-600">No incoming emails found.</li>
        )}
      </ul>
    </div>
  );
}