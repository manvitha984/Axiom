import { motion } from "framer-motion";
import { Check, ArrowRight } from "lucide-react";
import hero2 from "./assets/hero2.png-removebg-preview.png";

export default function CampaignSection() {
  const benefits = [
    "Optimize Business Operations – Enhance efficiency by automating repetitive tasks.",
    "Automate Document Processing – Convert and extract key data from documents seamlessly.",
    "Understand Customer Sentiment – Analyze emails to measure customer satisfaction and trends.",
    "Summarize Key Insights from Videos – AI-powered video summarization for quick decision-making.",
    "Scale with AI Efficiency – Adapt and grow without increasing manual effort."
  ];

  return (
    <section className="bg-gradient-to-br from-white to-[#FFF8F8] py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto flex flex-col-reverse md:flex-row items-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="md:w-1/2 flex justify-center mt-10 md:mt-0"
        >
          <div className="relative">
            {/* Decorative elements */}
            <div className="absolute -z-10 w-80 h-80 rounded-full bg-[#FE6059]/5 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
            <img 
              src={hero2} 
              alt="Campaign" 
              className="relative z-10 max-w-md w-full"
            />
          </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7 }}
          className="md:w-1/2 text-left md:pl-12"
        >
          <div className="inline-block px-4 py-1 mb-4 bg-[#FE6059]/10 rounded-full">
            <span className="text-sm font-medium text-[#FE6059]">
              Achieve Your Goals
            </span>
          </div>
          
          <h2 className="text-3xl font-bold text-gray-900 mb-6">
            Meet Campaign Goals with <span className="relative inline-block">
              <span className="relative z-10">Axiom</span>
              <span className="absolute bottom-0 left-0 right-0 h-3 bg-[#FE6059]/20 -z-1"></span>
            </span>
          </h2>
          
          <div className="space-y-5 mt-8">
            {benefits.map((benefit, index) => (
              <div 
                key={index}
                className="flex items-start"
              >
                <div className="shrink-0 mt-1">
                  <div className="w-6 h-6 rounded-full bg-[#FE6059]/15 flex items-center justify-center">
                    <Check size={14} className="text-[#FE6059]" />
                  </div>
                </div>
                <p className="ml-4 text-gray-700 leading-relaxed">{benefit}</p>
              </div>
            ))}
          </div>
          
          <div className="mt-8">
            <button className="px-7 py-3 bg-[#FE6059] text-white font-medium rounded-lg shadow-md hover:shadow-lg hover:bg-[#FE6059]/90 transform hover:-translate-y-0.5 transition-all duration-300 flex items-center group">
              Learn More
              <ArrowRight size={18} className="ml-2 transition-transform duration-300 group-hover:translate-x-1" />
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}