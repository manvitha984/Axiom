import { auth, db } from "./firebase";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import axios from "axios";

const API_URL = "http://localhost:5000"; // Adjust if needed

// 🔹 Helper function to get the token
const getAuthHeader = async () => {
    const user = auth.currentUser;
    if (user) {
        const token = await user.getIdToken(true); // Force token refresh
        console.log("Sending Token to Backend:", token);
        return { Authorization: `Bearer ${token}` };
    }
    return {};
};

// 🔹 Signup Function
export const signup = async (name, email, password) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Store user details in Firestore
    await setDoc(doc(db, "users", user.uid), { name, email, uid: user.uid });

    return { success: true, user };
  } catch (error) {
    console.error("🔹 Signup Error:", error.message);
    return { success: false, message: error.message };
  }
};

// 🔹 Login Function
export const login = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    console.error("🔹 Login Error:", error.message);
    return { success: false, message: error.message };
  }
};

// 🔹 Logout Function
export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("🔹 Logout Error:", error.message);
  }
};

// 🔹 Get Current User
export const getCurrentUser = (callback) => {
  return onAuthStateChanged(auth, callback);
};

// 🔹 Fetch User Data (Protected Route)
export const getUserData = async () => {
    try {
        const headers = await getAuthHeader(); // Get token first
        const res = await axios.get(`${API_URL}/user/me`, { headers });
        console.log("🔹 User Data Response:", res.data);
        return res.data;
    } catch (error) {
        console.error("🔹 Error Fetching User Data:", error.response?.data || error.message);
        if (error.response?.status === 401) {
            // Handle unauthorized error (e.g., redirect to login)
            console.log("Unauthorized: Redirecting to login...");
            // Redirect to login or refresh token
        }
        return null;
    }
};

// 🔹 Fetch Protected API Data
export const fetchProtectedData = async () => {
  try {
    const headers = await getAuthHeader(); 

    const res = await axios.get(`${API_URL}/protected-route`, { headers });
    console.log("🔹 Protected Route Response:", res.data);

    return res.data;
  } catch (error) {
    console.error("🔹 Error Fetching Protected Data:", error.response?.data || error.message);
    return null;
  }
};
