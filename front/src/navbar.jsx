import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav className="bg-[#FFF8F8] text-black">
      <div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
        <div className="relative flex h-16 items-center justify-end">
          <div className="flex items-center space-x-4">
            <Link
              to="/login"
              className="px-4 py-2 bg-[#FE6059] text-white font-medium rounded-md hover:bg-red-600"
            >
              Login
            </Link>
            <Link
              to="/signup"
              className="px-4 py-2 bg-[#FE6059] text-white font-medium rounded-md hover:bg-red-600"
            >
              Signup
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}