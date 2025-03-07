import React, { useState } from "react";
import { signup, getUserData } from "./services/authService";
import { Link, useNavigate } from "react-router-dom";

export default function Signup() {
  // formData holds the user inputs for name, email, and password
  // error holds any backend or validation errors
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState(null);

  // useNavigate lets us programmatically navigate to other routes (e.g. "/dashboard")
  const navigate = useNavigate();

  // handleChange updates the correct field in formData whenever the user types
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // handleSubmit is triggered when the form is submitted
  const handleSubmit = async (e) => {
     // Prevent default browser form submission
    e.preventDefault();

   // Attempt to sign up the user using the signup service
    const result = await signup(formData.name, formData.email, formData.password);

  // If signup is successful, fetch user data, then navigate to dashboard

    if (result.success) {
       // Fetch user details from the backend
      const userData = await getUserData();
      console.log("User Data:", userData);
      navigate("/dashboard");
    } else {
      // If signup fails, display the error message
      setError(result.message);
    }
  };
  // The signup form includes fields for name, email, and password
  return (
    <div className="min-h-screen bg-[#FFF8F8] flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">
          Create Your Account
        </h2>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Full Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              placeholder="Enter your full name"
              value={formData.name}
              onChange={handleChange}
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FE6059] focus:border-transparent"
              required
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FE6059] focus:border-transparent"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FE6059] focus:border-transparent"
              required
            />
          </div>
          {/* Display any errors from the backend */}
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          <div>
            <button
              type="submit"
              className="w-full px-4 py-2 bg-[#FE6059] text-white font-medium rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FE6059]"
            >
              Sign Up
            </button>
          </div>
        </form>
        {/* Link to go to the login page if the user already exists*/}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account? {" "}
            <Link to="/login" className="font-medium text-[#FE6059] hover:text-red-600">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
