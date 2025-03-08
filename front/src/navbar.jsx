import { Link } from "react-router-dom";
import { Settings } from "lucide-react";

export default function Navbar() {
  return (
    <nav className="bg-[#FFF8F8] text-black shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative flex h-16 items-center justify-between">
          {/* Logo and Brand Name */}
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-[#FE6059] flex items-center justify-center shadow-md">
              <Settings className="text-white w-6 h-6" />
            </div>
            <h2 className="ml-3 text-xl font-bold text-gray-800">Axiom</h2>
          </div>
          
          {/* Navigation Links */}
          <div className="flex items-center space-x-4">
            <Link
              to="/login"
              className="px-4 py-2 bg-[#FE6059] text-white font-medium rounded-lg shadow-sm hover:bg-[#FE6059]/90 transition-all duration-200 hover:-translate-y-0.5"
            >
              Login
            </Link>
            <Link
              to="/signup"
              className="px-4 py-2 border border-[#FE6059] bg-white text-[#FE6059] font-medium rounded-lg shadow-sm hover:bg-[#FE6059]/5 transition-all duration-200 hover:-translate-y-0.5"
            >
              Signup
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}