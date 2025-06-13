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
      navigate('/home');
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-500 to-blue-600 p-4">
      <div className="w-full max-w-md p-8 rounded-xl shadow-2xl
                     bg-opacity-30 backdrop-filter backdrop-blur-lg
                    border border-white border-opacity-40
                    ">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">BRSR Login</h1>
          <p className="text-gray-800 text-opacity-90 mt-2">Sign in to your account</p>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-500 bg-opacity-40 rounded-lg text-gray-900 text-center">
            {error}
          </div>
        )}
        
        <LoginForm />
      </div>
    </div>
  );
};

export default Login;