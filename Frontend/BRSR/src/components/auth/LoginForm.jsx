import React, { useState } from 'react';
import { useLoginMutation, useLazyGetCompanyDetailsQuery } from '../../store/api/apiSlice';
import { useDispatch } from 'react-redux';
import { setCredentials, setError, setCompanyDetails } from '../../store/slices/authSlice';
import { Link } from 'react-router-dom';

const LoginForm = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  
  const [login, { isLoading }] = useLoginMutation();
  const [getCompanyDetails, { isLoading: isLoadingCompanyDetails }] = useLazyGetCompanyDetailsQuery();
  const dispatch = useDispatch();
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Convert to FormData for FastAPI OAuth2PasswordRequestForm compatibility
      const formDataObj = new FormData();
      formDataObj.append('username', formData.username);
      formDataObj.append('password', formData.password);
      
      const result = await login(formDataObj).unwrap();
      dispatch(setCredentials(result));
      
      // After successful login, fetch company details
      try {
        const companyDetails = await getCompanyDetails(result.user_id).unwrap();
        dispatch(setCompanyDetails(companyDetails));
      } catch (companyErr) {
        console.error('Error fetching company details:', companyErr);
        // Don't block the login flow if company details fetch fails
      }
    } catch (err) {
      console.error('Login error:', err);
      dispatch(setError(err.data?.detail || 'Login failed. Please check your credentials.'));
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="username" className="block text-sm font-medium text-white mb-1 glassmorphism-text">
          Email or Username
        </label>
        <input
          id="username"
          name="username"
          type="text"
          required
          value={formData.username}
          onChange={handleChange}
          className="w-full px-4 py-2 rounded-lg bg-white bg-opacity-40 border border-white border-opacity-60
                   text-white placeholder-white placeholder-opacity-80 focus:outline-none focus:ring-2 focus:ring-teal-300
                   shadow-md input-visible"
          placeholder="Enter your email or username"
        />
      </div>
      
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-white mb-1 glassmorphism-text">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          value={formData.password}
          onChange={handleChange}
          className="w-full px-4 py-2 rounded-lg bg-white bg-opacity-40 border border-white border-opacity-60
                   text-white placeholder-white placeholder-opacity-80 focus:outline-none focus:ring-2 focus:ring-teal-300
                   shadow-md input-visible"
          placeholder="Enter your password"
        />
      </div>
      
      <div className="flex justify-end">
        <Link to="/forgot-password" className="text-sm text-white hover:text-teal-200 transition-colors duration-200 glassmorphism-text">
          Forgot Password?
        </Link>
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
          {isLoading ? 'Signing in...' : 'Sign In'}
        </button>
      </div>
    </form>
  );
};

export default LoginForm;