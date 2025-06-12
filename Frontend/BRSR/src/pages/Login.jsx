import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLoginMutation } from '../store/api/apiSlice';
import { useDispatch, useSelector } from 'react-redux';
import { selectIsAuthenticated, selectAuthError, clearError } from '../store/slices/authSlice';
import LoginForm from '../components/auth/LoginForm';

const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const error = useSelector(selectAuthError);
  
  // Clear any errors when component mounts or unmounts
  useEffect(() => {
    dispatch(clearError());
    return () => dispatch(clearError());
  }, [dispatch]);
  
  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-500 to-blue-600 p-4">
      <div className="w-full max-w-md p-8 rounded-xl shadow-2xl
                    bg-white bg-opacity-30 backdrop-filter backdrop-blur-lg
                    border border-white border-opacity-40
                    shadow-[0_0_20px_rgba(0,255,255,0.2)]">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white glassmorphism-text">BRSR Login</h1>
          <p className="text-white text-opacity-90 mt-2 glassmorphism-text">Sign in to your account</p>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-500 bg-opacity-40 rounded-lg text-white text-center glassmorphism-text">
            {error}
          </div>
        )}
        
        <LoginForm />
      </div>
    </div>
  );
};

export default Login;