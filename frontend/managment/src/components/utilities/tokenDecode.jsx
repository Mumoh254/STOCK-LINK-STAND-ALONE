// utils/getUserFromToken.js
import { jwtDecode } from "jwt-decode"; // ✅ fixed

export const getUserIdFromToken = () => {
  const token = localStorage.getItem("token");
  if (!token) return null;

  try {
    const decoded = jwtDecode(token);
    return decoded?.id || decoded?.userId || decoded?._id || null;
  } catch (error) {
    console.error("Invalid token:", error);
    return null;
  }
};
/**
 * Get full user info (id, name, role) from JWT
 */
export const getUserNameFromToken = () => {
  const token = localStorage.getItem("token");
  if (!token) return null;

  try {
    const decoded = jwtDecode(token);

    return {
      id: decoded?.id || decoded?.userId || decoded?._id || null,
      name: decoded?.name || "Unknown",
      role: decoded?.role || "USER",
    };
  } catch (error) {
    console.error("Invalid token:", error);
    return null;
  }
};
