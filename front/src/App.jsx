import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./navbar";
import HeroSection from "./herosection";
import DepartmentsSection from "./DepartmentsSection";
import CampaignSection from "./CampaignSection";
import SlidesSection from "./Slides";
import Footer from "./footer";
import LoginPage from "./login";
import Signup from "./signup";
import Dashboard from "./dashboard";
import Tasks from "./taskpage";
import Messages from "./messages";
import PostLoginLayout from "./postloginlayout";
import Projects from "./projects";
import VideoSummarizer from "./videoSummarizer";
import InvoiceDataExtractor from "./invoiceDataExtractor"; // New component

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes (Before Login) */}
        <Route
          path="/"
          element={
            <>
              <Navbar />
              <HeroSection />
              <DepartmentsSection />
              <CampaignSection />
              <SlidesSection />
              <Footer />
            </>
          }
        />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<Signup />} />

        {/* Protected Routes (After Login) */}
        <Route element={<PostLoginLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/videosummarizer" element={<VideoSummarizer />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/taskpage" element={<Tasks />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/invoiceDataExtractor" element={<InvoiceDataExtractor />} /> {/* New route */}
        </Route>
      </Routes>
    </Router>
  );
}