import { Disclosure } from "@headlessui/react";
import { Link, Outlet, useLocation } from "react-router-dom";
// This function handles logging out by removing local storage items
// so that user-related data is cleared upon logout.
const handleLogout = () => {
  // Removes stored emails and frustration summary
  localStorage.removeItem('emails');
  localStorage.removeItem('frustrationSummary');
};
// This array defines the navigation links displayed in the sidebar.
const navigation = [
  { name: "Dashboard", href: "/dashboard" },
  { name: "Video Summarizer", href: "/videoSummarizer" },
  { name: "InvoiceDataExtractor", href: "/invoiceDataExtractor" },
  { name: "ChatBot", href: "/chatBox" }
];
// This functional component represents the layout used after the user logs in.
// It includes a sidebar (with navigation links) and a main content area where
// other routes (children) are rendered via <Outlet/>.
export default function PostLoginLayout() {
    // Provides access to the current route location (e.g. "/dashboard", etc.)
  const location = useLocation();
 // The main layout is made up of a fixed sidebar (left side) and
  // a flexible content area (right side).
  return (
    <div className="flex">
      {/* Fixed Sidebar */}
      <div className="fixed top-0 left-0 h-screen w-64 bg-[#FE6059] text-white p-4">
        <div className="flex items-center mb-10">
          <h2 className="ml-2 text-2xl font-bold">Dashboard</h2>
        </div>
       {/* Navigation Links List */}
        <ul className="space-y-4">
          {navigation.map((item) => (
            <li key={item.name}>
              <Link
                to={item.href}
                className={`block px-4 py-2 text-lg font-medium rounded-md transition-all duration-200 ${
                  location.pathname === item.href
                    ? 'bg-white text-[#FE6059] shadow-md'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      {/* Main Content Area (to the right of the sidebar) */}
      <div className="ml-64 flex-1 bg-[#FFF8F8] p-8">
        <Disclosure as="nav" className="bg-[#FFF8F8] text-black mb-6">
          <div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
            <div className="relative flex h-16 items-center justify-center">
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 sm:static sm:inset-auto sm:ml-6 sm:pr-0">
               {/* Logout Link triggers handleLogout and redirects to /login */}
                <Link
                  to="/login"
                  onClick={handleLogout}
                  className="px-4 py-2 bg-[#FE6059] text-white font-medium rounded-md hover:bg-red-600"
                >
                  Logout
                </Link>
              </div>
            </div>
          </div>
        </Disclosure>
        <Outlet />
      </div>
    </div>
  );
}
