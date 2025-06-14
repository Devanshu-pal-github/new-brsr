import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { selectIsAuthenticated, selectAuthError, clearError } from '../store/slices/authSlice';
import { Shield } from 'lucide-react';
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1E3A8A]/10 via-[#14B8A6]/10 to-white p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <Shield className="w-12 h-12 text-[#1E3A8A] mb-3" />
          <h2 className="text-3xl font-bold text-[#1E3A8A]">Welcome Back</h2>
          <p className="text-[#1E3A8A]/70 text-sm mt-2">Sign in to your account</p>
        </div>
        {error && (
          <div className="mb-6 text-red-500 text-sm text-center">
            {error}
          </div>
        )}
        <LoginForm />
      </div>
    </div>
  );
};

export default Login;