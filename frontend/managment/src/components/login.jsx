import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiLock,
  FiMail,
  FiLogIn,
  FiLoader,
  FiCheckCircle
} from 'react-icons/fi';
import axios from 'axios';
import styled, { keyframes } from 'styled-components';
import * as Yup from 'yup';
import { Formik, Form, Field, ErrorMessage } from 'formik';

// --- Stock Link Color Palette ---
const colors = {
  primary: '#FF4532', // Stock Link Red
  secondary: '#00C853', // Stock Link Green (used for success messages)
  darkText: '#1A202C', // Dark text for headings
  lightBackground: '#F0F2F5', // Light background for the page
  cardBackground: '#FFFFFF', // White for the form card
  borderColor: '#D1D9E6', // Light border for inputs
  errorText: '#EF4444', // Red for errors
  placeholderText: '#A0AEC0', // Muted text for placeholders
  buttonHover: '#E6392B', // Darker red on button hover
  disabledButton: '#CBD5E1', // Gray for disabled buttons
};

// --- Animations ---
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

// --- Styled Components ---

const PageWrapper = styled.div`
  min-height: 100vh;
  background: ${colors.lightBackground};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  animation: ${fadeIn} 0.8s ease-out;
`;

const AuthContainer = styled.div`
  max-width: 450px;
  width: 100%;
  padding: 2.5rem;
  background: ${colors.cardBackground};
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.15);
  text-align: center;
`;

const Header = styled.div`
  margin-bottom: 2.5rem;
  .icon {
    font-size: 3.5rem;
    color: ${colors.primary};
    margin-bottom: 1rem;
    display: block;
    margin-left: auto;
    margin-right: auto;
  }
  h1 {
    font-size: 2.2rem;
    font-weight: 700;
    color: ${colors.darkText};
  }
  p {
    font-size: 1rem;
    color: ${colors.placeholderText};
    margin-top: 0.5rem;
  }
`;

const FormGroup = styled.div`
  margin-bottom: 1.5rem;
  position: relative;
`;

const IconWrapper = styled.div`
  position: absolute;
  top: 50%;
  left: 1rem;
  transform: translateY(-50%);
  color: ${colors.placeholderText};
  font-size: 1.2rem;
`;

const InputField = styled(Field)`
  width: 100%;
  padding: 0.9rem 1.2rem 0.9rem 3rem;
  border: 1px solid ${colors.borderColor};
  border-radius: 10px;
  font-size: 1.05rem;
  color: ${colors.darkText};
  background-color: ${colors.lightBackground};
  transition: all 0.3s ease;

  &::placeholder {
    color: ${colors.placeholderText};
  }

  &:focus {
    outline: none;
    border-color: ${colors.primary};
    box-shadow: 0 0 0 3px rgba(255, 69, 50, 0.2);
    background-color: ${colors.cardBackground};
  }
`;

const ErrorText = styled.div`
  color: ${colors.errorText};
  font-size: 0.875rem;
  margin-top: 0.5rem;
  text-align: left;
`;

const SuccessText = styled.div`
  color: ${colors.secondary};
  font-size: 0.95rem;
  margin-top: 0.5rem;
  margin-bottom: 1rem;
  text-align: center;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
`;

const SubmitButton = styled.button`
  width: 100%;
  padding: 0.9rem;
  background: ${colors.primary};
  color: ${colors.cardBackground};
  border: none;
  border-radius: 10px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.1s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;

  &:hover {
    background: ${colors.buttonHover};
    transform: translateY(-1px);
  }

  &:disabled {
    background: ${colors.disabledButton};
    cursor: not-allowed;
    transform: none;
  }
`;

const LinkText = styled.p`
  text-align: center;
  margin-top: 1.5rem;
  font-size: 0.95rem;
  color: ${colors.darkText};

  a {
    color: ${colors.secondary};
    font-weight: 600;
    text-decoration: none;
    transition: color 0.2s ease;
    &:hover {
      color: #00B247;
      text-decoration: underline;
    }
  }
`;

// --- Validation Schema for Login ---
const validationSchema = Yup.object().shape({
  Email: Yup.string()
    .email('Invalid email address')
    .required('Email is required'),
  Password: Yup.string()
    .min(8, 'Password must be at least 8 characters')
    .required('Password is required'),
});

const BASE_URL = "http://127.0.0.1:5001/api"; // Corrected BASE_URL to include /api

const Login = ({ onLoginSuccess }) => { // Accept onLoginSuccess as a prop
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');
  const [loginSuccess, setLoginSuccess] = useState(false);

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      setServerError('');
      setLoginSuccess(false);

      const response = await axios.post(`${BASE_URL}/auth/login`, {
        Email: values.Email,
        Password: values.Password,
      });

      if (response.status === 200) {
        const { token } = response.data;
        if (token) {
          localStorage.setItem('token', token);
          setLoginSuccess(true);
          onLoginSuccess(); // Call the prop function to update App.js state
          setTimeout(() => {
            navigate('/products');
          }, 1500);
        } else {
          setServerError('Login successful, but no token received.');
        }
      } else {
        setServerError(response.data?.message || 'Login failed with an unexpected status.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setServerError(error.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageWrapper>
      <AuthContainer>
        <Header>
          <FiLogIn className="icon" />
          <h1>Welcome Back to Stock Link</h1>
          <p>Login to manage your inventory efficiently.</p>
        </Header>

        <Formik
          initialValues={{
            Email: '',
            Password: '',
          }}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {({ isSubmitting }) => (
            <Form>
              {/* Email Field */}
              <FormGroup>
                <IconWrapper><FiMail /></IconWrapper>
                <InputField name="Email" type="email" placeholder="Email" />
                <ErrorMessage name="Email" component={ErrorText} />
              </FormGroup>

              {/* Password Field */}
              <FormGroup>
                <IconWrapper><FiLock /></IconWrapper>
                <InputField name="Password" type="password" placeholder="Password" />
                <ErrorMessage name="Password" component={ErrorText} />
              </FormGroup>

              {serverError && <ErrorText style={{ marginBottom: '1rem' }}>{serverError}</ErrorText>}
              {loginSuccess && (
                <SuccessText>
                  <FiCheckCircle /> Login successful! Redirecting...
                </SuccessText>
              )}

              <SubmitButton type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <FiLoader className="animate-spin" />
                    Logging in...
                  </>
                ) : (
                  'Login to Stock Link'
                )}
              </SubmitButton>

              <LinkText>
                <Link to="/forgot-password">
                  Forgot Password?
                </Link>
              </LinkText>
            </Form>
          )}
        </Formik>
      </AuthContainer>
    </PageWrapper>
  );
};

export default Login;
