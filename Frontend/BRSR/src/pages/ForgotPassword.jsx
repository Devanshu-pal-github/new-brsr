import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUpdatePasswordMutation } from '../store/api/apiSlice';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState(1); // 1: Email entry, 2: Password reset
  const [updatePassword, { isLoading }] = useUpdatePasswordMutation();
  const [status, setStatus] = useState({ success: false, message: '' });
  const navigate = useNavigate();

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    
    // In a real application, this would send a request to the backend to verify the email
    // and send a reset link. For this demo, we'll just move to the next step.
    setStep(2);
    setStatus({
      success: true,
      message: 'Email verified. Please set your new password.'
    });
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    // Validate passwords
    if (password !== confirmPassword) {
      setStatus({
        success: false,
        message: 'Passwords do not match.'
      });
      return;
    }
    
    if (password.length < 8) {
      setStatus({
        success: false,
        message: 'Password must be at least 8 characters long.'
      });
      return;
    }
    
    try {
      // Use the existing updatePassword endpoint
      await updatePassword({ password }).unwrap();
      
      setStatus({
        success: true,
        message: 'Password has been reset successfully!'
      });
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
      
    } catch (err) {
      console.error('Password reset error:', err);
      setStatus({
        success: false,
        message: err.data?.detail || 'Failed to reset password. Please try again.'
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-500 to-blue-600 p-4">
      <div className="w-full max-w-md p-8 rounded-xl shadow-2xl
                    bg-white bg-opacity-30 backdrop-filter backdrop-blur-lg
                    border border-white border-opacity-40
                    shadow-[0_0_20px_rgba(0,255,255,0.2)]">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white glassmorphism-text">Reset Password</h1>
          <p className="text-white text-opacity-90 mt-2 glassmorphism-text">
            {step === 1 ? 'Enter your email to reset your password' : 'Create a new password'}
          </p>
        </div>
        
        {status.message && (
          <div className={`mb-6 p-3 rounded-lg text-white text-center glassmorphism-text ${
            status.success ? 'bg-green-500 bg-opacity-40' : 'bg-red-500 bg-opacity-40'
          }`}>
            {status.message}
          </div>
        )}
        
        {step === 1 ? (
          <form onSubmit={handleEmailSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white mb-1 glassmorphism-text">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-white bg-opacity-40 border border-white border-opacity-60
                         text-white placeholder-white placeholder-opacity-80 focus:outline-none focus:ring-2 focus:ring-teal-300
                         shadow-md input-visible"
                placeholder="Enter your email address"
              />
            </div>
            
            <div>
              <button
                type="submit"
                className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-teal-400 to-blue-500
                         text-white font-medium shadow-lg hover:from-teal-500 hover:to-blue-600
                         focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-400
                         transition-all duration-300
                         transform hover:-translate-y-0.5 active:translate-y-0"
              >
                Continue
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handlePasswordSubmit} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white mb-1 glassmorphism-text">
                New Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-white bg-opacity-40 border border-white border-opacity-60
                         text-white placeholder-white placeholder-opacity-80 focus:outline-none focus:ring-2 focus:ring-teal-300
                         shadow-md input-visible"
                placeholder="Enter your new password"
              />
            </div>
            
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-white mb-1 glassmorphism-text">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-white bg-opacity-40 border border-white border-opacity-60
                         text-white placeholder-white placeholder-opacity-80 focus:outline-none focus:ring-2 focus:ring-teal-300
                         shadow-md input-visible"
                placeholder="Confirm your new password"
              />
            </div>
            
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-teal-400 to-blue-500
                         text-white font-medium shadow-lg hover:from-teal-500 hover:to-blue-600
                         focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-400
                         transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed
                         transform hover:-translate-y-0.5 active:translate-y-0"
              >
                {isLoading ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          </form>
        )}
        
        <div className="mt-6 text-center">
          <Link to="/login" className="text-white hover:text-teal-200 transition-colors duration-200 glassmorphism-text">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;