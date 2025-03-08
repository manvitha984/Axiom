import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
/**
 * This component presents a slide-based UI element that displays different
 * text headings and contents, automatically cycling through them via an interval.
 */
export default function SlidesSection() {
  // State to keep track of the current slide index
  const [currentSlide, setCurrentSlide] = useState(0);
  // Array of slides with headings and content
  const slides = [
    {
      heading: "AI-Powered Email Analysis for Customer Insights",
      content:
        "Emails are a goldmine of customer sentiment and business intelligence. Our AI-driven email analysis system processes incoming messages, categorizes them based on urgency, and extracts key sentiments to help businesses understand customer needs. Whether it's tracking complaints, identifying positive feedback, or analyzing trends over time, our solution enables enterprises to make data-driven decisions. By automating email processing, companies can respond faster, improve customer satisfaction, and gain valuable insights into emerging issues before they escalate.",
      icon: "📧"
    },
    {
      heading: "Smart Video Summarization for Quick Decision-Making",
      content:
        "Meetings, customer calls, and training videos often contain crucial information, but reviewing lengthy recordings is time-consuming. Our AI-based video summarization tool automatically detects key moments, extracts highlights, and generates concise summaries. Using natural language processing and computer vision, it identifies speaker changes, emotional tone, and context to provide meaningful insights without watching the entire footage. Whether you need a recap of a one-hour meeting in five minutes or an AI-generated transcript with action items, our system ensures that no critical information is lost while saving valuable time.",
      icon: "🎥"
    },
    {
      heading: "Intelligent Document Processing for Automated Workflows",
      content:
        "Handling large volumes of documents—contracts, invoices, reports, or scanned paperwork—can be tedious and error-prone. Our intelligent document processing system leverages OCR (Optical Character Recognition) and AI-driven text extraction to convert unstructured data into actionable insights. It can automatically classify documents, extract important fields such as dates, signatures, and financial data, and integrate seamlessly with enterprise resource planning (ERP) systems. This reduces manual data entry, minimizes human errors, and enhances operational efficiency. Businesses can now process thousands of documents in minutes, improving compliance, record-keeping, and decision-making.",
      icon: "📄"
    },
  ];
  
  /**
   * useEffect sets up a 5-second interval that increments the slide index.
   * Once the index reaches the end of the slides array, it loops back to 0.
   * Clearing the interval on unmount prevents memory leaks.
   */
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prevSlide) => (prevSlide + 1) % slides.length);
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  const goToNext = () => {
    setCurrentSlide((prevSlide) => (prevSlide + 1) % slides.length);
  };

  const goToPrevious = () => {
    setCurrentSlide((prevSlide) => (prevSlide - 1 + slides.length) % slides.length);
  };

  return (
    <section className="bg-[#FFF8F8] py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Section heading */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            AI-Powered Solutions
          </h2>
          <div className="h-1 w-20 bg-[#FE6059] mx-auto mb-6 rounded-full"></div>
          <p className="text-lg text-gray-600">
            Discover how our technology can transform your business operations
          </p>
        </div>
        
        {/* Slides container */}
        <div className="relative">
          {/* Navigation arrows */}
          <button 
            onClick={goToPrevious} 
            className="absolute left-0 top-1/2 -translate-y-1/2 -ml-4 sm:-ml-6 z-10 bg-white rounded-full p-2 shadow-md hover:bg-gray-100 transition-colors"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-6 w-6 text-gray-700" />
          </button>
          
          <button 
            onClick={goToNext} 
            className="absolute right-0 top-1/2 -translate-y-1/2 -mr-4 sm:-mr-6 z-10 bg-white rounded-full p-2 shadow-md hover:bg-gray-100 transition-colors"
            aria-label="Next slide"
          >
            <ChevronRight className="h-6 w-6 text-gray-700" />
          </button>
          
          {/* Slide content */}
          <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-12 border border-gray-100">
            <div className="flex flex-col sm:flex-row items-center sm:items-start mb-6">
              <div className="text-4xl sm:text-5xl mb-4 sm:mb-0 sm:mr-6">
                {slides[currentSlide].icon}
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2 relative inline-block">
                  {slides[currentSlide].heading}
                  <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-[#FE6059]/70"></span>
                </h3>
              </div>
            </div>
            <p className="text-gray-600 leading-relaxed">
              {slides[currentSlide].content}
            </p>
            
            <div className="text-center mt-8">
              <button className="px-5 py-2.5 bg-[#FE6059]/10 text-[#FE6059] font-medium rounded-lg hover:bg-[#FE6059]/20 transition-colors">
                Learn More
              </button>
            </div>
          </div>
        </div>
        
        {/* Dot indicators */}
        <div className="flex justify-center space-x-4 mt-6">
          {slides.map((_, index) => (
            <button
              key={index}
              className={`transition-all duration-300 focus:outline-none ${
                currentSlide === index 
                  ? "h-3 w-8 rounded-full bg-[#FE6059]" 
                  : "h-3 w-3 rounded-full bg-gray-300 hover:bg-gray-400"
              }`}
              onClick={() => setCurrentSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
            ></button>
          ))}
        </div>
      </div>
    </section>
  );
}