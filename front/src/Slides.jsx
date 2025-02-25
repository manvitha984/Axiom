import { useState, useEffect } from "react";

export default function SlidesSection() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      heading: "AI-Powered Email Analysis for Customer Insights",
      content:
        "Emails are a goldmine of customer sentiment and business intelligence. Our AI-driven email analysis system processes incoming messages, categorizes them based on urgency, and extracts key sentiments to help businesses understand customer needs. Whether it's tracking complaints, identifying positive feedback, or analyzing trends over time, our solution enables enterprises to make data-driven decisions. By automating email processing, companies can respond faster, improve customer satisfaction, and gain valuable insights into emerging issues before they escalate.",
    },
    {
      heading: "Smart Video Summarization for Quick Decision-Making",
      content:
        "Meetings, customer calls, and training videos often contain crucial information, but reviewing lengthy recordings is time-consuming. Our AI-based video summarization tool automatically detects key moments, extracts highlights, and generates concise summaries. Using natural language processing and computer vision, it identifies speaker changes, emotional tone, and context to provide meaningful insights without watching the entire footage. Whether you need a recap of a one-hour meeting in five minutes or an AI-generated transcript with action items, our system ensures that no critical information is lost while saving valuable time.",
    },
    {
      heading: "Intelligent Document Processing for Automated Workflows",
      content:
        "Handling large volumes of documents—contracts, invoices, reports, or scanned paperwork—can be tedious and error-prone. Our intelligent document processing system leverages OCR (Optical Character Recognition) and AI-driven text extraction to convert unstructured data into actionable insights. It can automatically classify documents, extract important fields such as dates, signatures, and financial data, and integrate seamlessly with enterprise resource planning (ERP) systems. This reduces manual data entry, minimizes human errors, and enhances operational efficiency. Businesses can now process thousands of documents in minutes, improving compliance, record-keeping, and decision-making.",
    },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prevSlide) => (prevSlide + 1) % slides.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="bg-[#FFF8F8] py-10 px-8">
      <div className="max-w-7xl mx-auto text-center">
        <div className="mt-0">
          <div className="w-full h-70 p-6 rounded-md">
            <h3 className="text-2xl font-bold bg-[#f4f4fa] inline-block px-4 py-2 rounded-md">
              {slides[currentSlide].heading}
            </h3>
            <p className="text-lg text-gray-600 mt-4">
              {slides[currentSlide].content}
            </p>
          </div>
        </div>
      </div>
      <div className="flex justify-center space-x-4 mt-4">
        {slides.map((_, index) => (
          <div
            key={index}
            className={`h-3 w-3 rounded-full cursor-pointer transition-all ${
              currentSlide === index ? "bg-red-500 w-4" : "bg-gray-300"
            }`}
            onClick={() => setCurrentSlide(index)}
          ></div>
        ))}
      </div>
    </section>
  );
}
