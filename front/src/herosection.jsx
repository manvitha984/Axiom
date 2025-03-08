import { motion } from "framer-motion";
import hero from "./assets/hero.png";
import { ArrowRight } from "lucide-react";

export default function HeroSection() {
  return (
    <section className="bg-gradient-to-br from-[#FFF8F8] to-[#FFF0F0] py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7 }}
          className="md:w-1/2 text-left"
        >
          <div className="inline-block px-4 py-1 mb-4 bg-white/70 rounded-full shadow-sm">
            <span className="text-sm font-medium text-[#FE6059]">AI-Powered Business Solutions</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
            Automate Workflows, <br /> 
            <span className="relative">
              Boost 
              <span className="absolute -bottom-2 left-0 right-0 h-1 bg-[#FE6059]"></span>
            </span> Productivity with AI
          </h1>
          
          <h2 className="text-lg md:text-xl text-gray-600 mt-6 leading-relaxed max-w-xl">
            AI-driven automation to streamline repetitive tasks, optimize efficiency, and transform how your business operates.
          </h2>
          
          <div className="mt-8 flex flex-wrap gap-4">
            <button className="px-7 py-3 bg-[#FE6059] text-white font-medium rounded-lg shadow-md hover:shadow-lg hover:bg-[#FE6059]/90 transform hover:-translate-y-0.5 transition-all duration-300 flex items-center">
              Get Started
              <ArrowRight size={18} className="ml-1.5 transition-all group-hover:translate-x-1" />
            </button>
            
            <button className="px-7 py-3 border border-gray-300 bg-white text-gray-700 font-medium rounded-lg shadow-sm hover:shadow hover:bg-gray-50 transform hover:-translate-y-0.5 transition-all duration-300">
              Learn More
            </button>
          </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="md:w-1/2 flex justify-center mt-12 md:mt-0"
        >
          <div className="relative">
            {/* Decorative elements */}
            <div className="absolute -top-6 -left-6 w-20 h-20 rounded-full bg-[#FE6059]/10 z-0"></div>
            <div className="absolute -bottom-6 -right-6 w-16 h-16 rounded-full bg-[#FE6059]/10 z-0"></div>
            
            {/* Image with shadow and border */}
            <img 
              src={hero} 
              alt="AI Automation" 
              className="rounded-2xl shadow-xl relative z-10 border border-white/50 w-full max-w-lg"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}