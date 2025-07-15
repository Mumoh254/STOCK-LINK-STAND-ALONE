import React, { useState, useEffect } from 'react';
import { Routes, Route, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Container, Navbar, Nav, Button } from 'react-bootstrap';
import { CartProvider } from './context/cartContext';
import {
  FiBox,         // For Products: a classic, solid box for inventory
  FiBarChart,     // For Analytics: a clean bar chart
  FiTrendingUp,   // For Stock Analysis: indicates growth/trends
  FiPlusCircle,   // For Create Product: a universal add icon
  FiLogOut,       // For Logout: a clear exit icon
  FiShoppingCart, // For Cart: a shopping cart
  FiUser          // If you ever add a profile link
} from 'react-icons/fi'; // Using Feather Icons for a clean, line-icon aesthetic
import ProductList from './components/productList';
import CartSidebar from './components/cartSide';
import Analytics from './components/analytics';
import StockAnalytics from './components/stockAnalysis';
import ProductForm from './components/productForm';
import Login from './components/login';
import Register from './components/register';
import { toast } from 'react-toastify';
import ForgotPassword from './components/forgotPassword';

import './App.css';

// PrivateRoute component to protect routes
const PrivateRoute = ({ children }) => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token'); // Check for token in localStorage

  useEffect(() => {
    if (!token) {
      toast.error('You need to log in to access this page.');
      navigate('/login'); // Redirect to login if no token
    }
  }, [token, navigate]);

  return token ? children : null; // Render children if token exists, otherwise null (will redirect)
};

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Function to check authentication status
  const checkAuthStatus = () => {
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token); // Set isLoggedIn to true if token exists, false otherwise
  };

  useEffect(() => {
    // Check auth status on initial load
    checkAuthStatus();

    // Listen for changes in localStorage (e.g., from logout in ProductList)
    window.addEventListener('storage', checkAuthStatus);

    // Clean up event listener
    return () => {
      window.removeEventListener('storage', checkAuthStatus);
    };
  }, []);

  // Function to close the navbar collapse
  const closeNavbar = () => {
    const navbarCollapse = document.getElementById('main-nav');
    if (navbarCollapse && navbarCollapse.classList.contains('show')) {
      navbarCollapse.classList.remove('show');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token'); // Remove the token
    setIsLoggedIn(false); // Update auth state
    toast.info('You have been logged out.');
    navigate('/login'); // Redirect to login page
    closeNavbar(); // Close navbar after logout
  };

  // Conditional navigation links with revised icons
  const loggedInNavLinks = [
    { path: "/products", icon: <FiBox />, text: "Products" },
    { path: "/analytics", icon: <FiBarChart />, text: "Analytics" },
    { path: "/stock-analytics", icon: <FiTrendingUp />, text: "Stock Analysis" },
    { path: "/create", icon: <FiPlusCircle />, text: "Create Product" },
  ];

  // Determine if header and footer should be shown
  const showHeaderAndFooter = isLoggedIn;

  return (
    <CartProvider>
      {showHeaderAndFooter && ( // Conditionally render Navbar
        <Navbar expand="lg" className="app-navbar shadow-sm position-sticky z-3 top-0">
          <Container fluid>
            <Navbar.Brand as={NavLink} to="/" className="d-flex align-items-center me-4">
              <span className="navbar-brand-text">Stock-Link</span>
            </Navbar.Brand>

            <Navbar.Toggle aria-controls="main-nav" className="custom-toggler border-0" />

            <Navbar.Collapse id="main-nav">
              <Nav className="mx-auto nav-links-group"> {/* Custom class for main nav links */}
                {loggedInNavLinks.map((link, index) => (
                  <Nav.Link
                    key={index}
                    as={NavLink}
                    to={link.path}
                    className={({ isActive }) =>
                      `nav-link-custom d-flex align-items-center${isActive ? ' active-link' : ''}`
                    }
                    onClick={closeNavbar}
                  >
                    <span className="nav-icon">{link.icon}</span>
                    <span className="nav-text">{link.text}</span>
                  </Nav.Link>
                ))}
              </Nav>

              <Nav className="ms-auto align-items-center">
                <CartSidebar />
                <Button
                  variant="outline-danger"
                  onClick={handleLogout}
                  className="logout-button d-flex align-items-center ms-lg-3 mt-2 mt-lg-0"
                >
                  <FiLogOut className="me-1" /> Logout
                </Button>
              </Nav>
            </Navbar.Collapse>
          </Container>
        </Navbar>
      )}

      <Container fluid className="main-content">
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login onLoginSuccess={checkAuthStatus} />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/register" element={<Register />} />

          {/* Protected routes */}
          <Route path="/" element={<PrivateRoute><ProductList /></PrivateRoute>} />
          <Route path="/products" element={<PrivateRoute><ProductList /></PrivateRoute>} />
          <Route path="/sales" element={<PrivateRoute><h2>Sales Component</h2></PrivateRoute>} />
          <Route path="/analytics" element={<PrivateRoute><Analytics /></PrivateRoute>} />
          <Route path="/stock-analytics" element={<PrivateRoute><StockAnalytics /></PrivateRoute>} />
          <Route path="/create" element={<PrivateRoute><ProductForm /></PrivateRoute>} />
        </Routes>
      </Container>

      {showHeaderAndFooter && ( // Conditionally render Footer
        <footer className="system-footer bg-light border-top p-2 d-flex flex-column">
          <Container fluid className="footer-top d-flex justify-content-between align-items-center mb-1">
            <span className="small footer-status">
              Logged in as: <span className="text-success fw-bold">{isLoggedIn ? 'Admin' : 'Guest'}</span> | System Status: <span className="text-success fw-bold">Operational</span>
            </span>
            <span className="small footer-version">
              <span className="text-primary fw-bold">Stock-Link</span> | SYS-VERSION - 1.1.01
            </span>
          </Container>
          <Container fluid className="footer-bottom text-center py-1">
            <marquee className="footer-marquee" behavior="scroll" direction="left" scrollamount="5">
              <span className="text-danger fw-bold me-3">🔥 System Failure? Get Expert Support! 🔥</span>
              <span className="text-dark me-3">Contact Us: <strong className="text-primary">0740045355</strong> | Email: <strong className="text-primary">infowelttallis@gmail.com</strong></span>
              <span className="text-info ms-3">Your Reliable Partner for Stock Management Solutions!</span>
            </marquee>
            <span className="small d-block mt-1">
              <strong>Powered By Welt Tallis</strong>
            </span>
          </Container>
        </footer>
      )}
    </CartProvider>
  );
}

export default App;