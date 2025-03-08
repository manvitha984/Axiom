import { Settings, Mail, Twitter, Linkedin, Github } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-br from-gray-900 to-black text-white pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-12">
          {/* Brand Section - Wider Column */}
          <div className="md:col-span-5 space-y-6">
            <div className="flex items-center justify-center md:justify-start">
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center">
                <Settings className="text-[#FE6059] w-7 h-7" />
              </div>
              <h2 className="ml-4 text-2xl font-bold">Axiom</h2>
            </div>
            <p className="text-gray-400 text-sm max-w-md">
              AI-powered solutions to automate workflows and boost productivity across your organization.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-[#FE6059] transition-colors p-2 hover:bg-white/5 rounded-full">
                <Twitter size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-[#FE6059] transition-colors p-2 hover:bg-white/5 rounded-full">
                <Linkedin size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-[#FE6059] transition-colors p-2 hover:bg-white/5 rounded-full">
                <Github size={20} />
              </a>
            </div>
          </div>

          {/* Solutions Section */}
          <div className="md:col-span-4 space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[#FE6059]">
              Solutions
            </h3>
            <ul className="space-y-3 text-sm">
              <li>
                <a href="#" className="text-gray-400 hover:text-white transition-colors inline-block hover:translate-x-1 duration-200">
                  Email Analysis
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white transition-colors inline-block hover:translate-x-1 duration-200">
                  Video Summarization
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white transition-colors inline-block hover:translate-x-1 duration-200">
                  Invoice Processing
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white transition-colors inline-block hover:translate-x-1 duration-200">
                  AI Chatbot
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Section */}
          <div className="md:col-span-3 space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[#FE6059]">
              Contact
            </h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Mail size={16} className="text-[#FE6059]" />
                <a href="mailto:info@axiom-ai.com" className="text-gray-400 hover:text-white transition-colors">
                  info@axiom-ai.com
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-gray-800">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <p className="text-sm text-gray-400 mb-4 md:mb-0">
              &copy; {currentYear} Axiom. All rights reserved to Manvitha.
            </p>
            <ul className="flex items-center space-x-8 text-sm text-gray-400">
              <li>
                <a href="#" className="hover:text-white transition-colors">Terms</a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">Privacy</a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">Cookies</a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}