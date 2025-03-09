import { useState, useEffect } from "react";
import { Disclosure } from "@headlessui/react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Video, 
  FileSpreadsheet, 
  MessageSquare, 
  LogOut,
  Menu,
  X,
  User,
  Settings
} from "lucide-react";
import { getCurrentUser, getUserData } from "./services/authService.js";

// This function handles logging out by removing local storage items
// so that user-related data is cleared upon logout.
const handleLogout = () => {
  // Removes stored emails and frustration summary
  localStorage.removeItem('emails');
  localStorage.removeItem('frustrationSummary');
};

// This array defines the navigation links displayed in the sidebar.
const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Video Summarizer", href: "/videoSummarizer", icon: Video },
  { name: "Invoice Data Extractor", href: "/invoiceDataExtractor", icon: FileSpreadsheet },
  { name: "ChatBot", href: "/chatBox", icon: MessageSquare },
  { name: "Logout", href: "/login", onClick: handleLogout, icon: LogOut } 
];

// Helper function to extract username from email
const getUsernameFromEmail = (email) => {
  if (!email) return "User";
  return email.split('@')[0];
};

// This functional component represents the layout used after the user logs in.
// It includes a sidebar (with navigation links) and a main content area where
// other routes (children) are rendered via <Outlet/>.
export default function PostLoginLayout() {
  // Provides access to the current route location (e.g. "/dashboard", etc.)
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
 
  // Fetch user data when component mounts
  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const data = await getUserData();
        if (data) {
          setUserData(data);
        } else {
          // If we couldn't fetch user data, try to get basic info from auth
          getCurrentUser((user) => {
            if (user) {
              setUserData({
                name: user.displayName || getUsernameFromEmail(user.email),
                email: user.email
              });
            } else {
              // No authenticated user, redirect to login
              navigate("/login");
            }
          });
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserDetails();
  }, [navigate]);

  // Get display name for user - prioritize name, fall back to email username
  const displayName = loading 
    ? "Loading..." 
    : (userData?.name || getUsernameFromEmail(userData?.email));

  // The main layout is made up of a fixed sidebar (left side) and
  // a flexible content area (right side).
  return (
    <div className="flex h-screen bg-[#FFF8F8]">
      {/* Mobile menu button */}
      <div className="fixed top-4 left-4 z-40 lg:hidden">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-full bg-[#FE6059] text-white shadow-lg focus:outline-none"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Fixed Sidebar */}
      <div 
        className={`fixed top-0 left-0 h-screen z-30 w-64 bg-gradient-to-b from-[#FE6059] to-[#f44336] text-white shadow-xl transition-all duration-300
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="flex items-center p-5 border-b border-white/10">
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
            <Settings className="text-[#FE6059] w-6 h-6" />
          </div>
          <h2 className="ml-3 text-2xl font-bold">Axiom</h2>
        </div>

        {/* Navigation Links List */}
        <ul className="space-y-2 mt-6 px-3">
          {navigation.map((item) => (
            <li key={item.name}>
              <Link
                to={item.href}
                onClick={item.onClick}
                className={`flex items-center px-4 py-3 text-md font-medium rounded-lg transition-all duration-200 ${
                  location.pathname === item.href
                    ? 'bg-white text-[#FE6059] shadow-md'
                    : 'text-white hover:bg-white/15'
                }`}
              >
                <item.icon size={20} className="mr-3" />
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
        
        {/* User profile section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-white/80 flex items-center justify-center">
              {loading ? (
                <div className="w-5 h-5 border-2 border-[#FE6059] border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <span className="text-[#FE6059] font-medium">
                  {displayName?.charAt(0).toUpperCase() || <User size={16} />}
                </span>
              )}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium capitalize">{displayName}</p>
              <p className="text-xs text-white/70">{loading ? "" : (userData?.email || "")}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area (to the right of the sidebar) */}
      <div className="ml-0 lg:ml-64 flex-1 p-4 md:p-8 pt-16 lg:pt-8">
        <Outlet />
      </div>
    </div>
  );
}