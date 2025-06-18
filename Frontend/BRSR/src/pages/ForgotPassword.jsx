import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useRequestPasswordResetMutation, useResetPasswordMutation } from '../store/api/apiSlice';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [step, setStep] = useState(1); // 1: Email entry, 2: Password reset
  const [status, setStatus] = useState({ success: false, message: '' });
  
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get the mutations
  const [requestReset, { isLoading: isRequestingReset }] = useRequestPasswordResetMutation();
  const [resetPassword, { isLoading: isResetting }] = useResetPasswordMutation();

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    try {
      const result = await requestReset(email).unwrap();
      setResetToken(result.token); // Store the token (in production, this would come from the URL)
      setStep(2);
      setStatus({
        success: true,
        message: 'Reset instructions sent. Please set your new password.'
      });
    } catch (err) {
      setStatus({
        success: false,
        message: err.data?.detail || 'Failed to send reset instructions.'
      });
    }
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
      await resetPassword({
        token: resetToken,
        password
      }).unwrap();
      
      setStatus({
        success: true,
        message: 'Password has been reset successfully! Redirecting to login...'
      });
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
      
    } catch (err) {
      setStatus({
        success: false,
        message: err.data?.detail || 'Failed to reset password. Please try again.'
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#000D30]">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-[#000D30]">Reset Password</h1>
          <p className="text-gray-600 mt-2">
            {step === 1 ? 'Enter your email to reset your password' : 'Create a new password'}
          </p>
        </div>
        
        {status.message && (
          <div className={`mb-6 p-3 rounded text-white text-sm text-center ${
            status.success ? 'bg-green-600' : 'bg-red-600'
          }`}>
            {status.message}
          </div>
        )}
        
        {step === 1 ? (
          <form onSubmit={handleEmailSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded border border-gray-300 focus:outline-none focus:ring-1 focus:ring-[#20305D] focus:border-[#20305D]"
                placeholder="Enter your email address"
              />
            </div>
            
            <button
              type="submit"
              disabled={isRequestingReset}
              className="w-full py-2 px-4 rounded bg-[#20305D] text-white font-medium hover:bg-[#000D30] 
                       transition-colors duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isRequestingReset ? 'Sending...' : 'Send Reset Instructions'}
            </button>
          </form>
        ) : (
          <form onSubmit={handlePasswordSubmit} className="space-y-5">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 rounded border border-gray-300 focus:outline-none focus:ring-1 focus:ring-[#20305D] focus:border-[#20305D]"
                placeholder="Enter new password"
              />
            </div>
            
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 rounded border border-gray-300 focus:outline-none focus:ring-1 focus:ring-[#20305D] focus:border-[#20305D]"
                placeholder="Confirm new password"
              />
            </div>
            
            <button
              type="submit"
              disabled={isResetting}
              className="w-full py-2 px-4 rounded bg-[#20305D] text-white font-medium hover:bg-[#000D30] 
                       transition-colors duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isResetting ? 'Resetting Password...' : 'Reset Password'}
            </button>
          </form>
        )}
        
        <div className="mt-6 text-center">
          <Link 
            to="/login" 
            className="text-[#20305D] hover:text-[#000D30] font-medium transition-colors duration-200"
          >
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;