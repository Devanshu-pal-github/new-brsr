import React, { useState } from 'react';
import { useLoginMutation, useLazyGetCompanyDetailsQuery } from '../../store/api/apiSlice';
import { useDispatch } from 'react-redux';
import { setCredentials, setError, setCompanyDetails } from '../../store/slices/authSlice';
import { Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';

const LoginForm = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  
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
      // Use URLSearchParams for FastAPI OAuth2PasswordRequestForm compatibility
      // This works better than FormData for this specific backend implementation
      const urlParams = new URLSearchParams();
      urlParams.append('username', formData.username);
      urlParams.append('password', formData.password);
      
      const result = await login(urlParams).unwrap();
      dispatch(setCredentials(result));
      
      // After successful login, fetch company details
      try {
        console.log('Fetching company details for user:', result.user_id);
        const companyDetails = await getCompanyDetails(result.user_id).unwrap();
        console.log('Company details fetched:', companyDetails);
        dispatch(setCompanyDetails(companyDetails));
      } catch (companyErr) {
        console.error('Error fetching company details:', companyErr);
        // Don't block the login flow if company details fetch fails
      }
    } catch (err) {
      console.error('Login error:', err);
      console.error('Login error details:', {
        status: err.status,
        data: err.data,
        error: err.error,
        message: err.message
      });
      
      // Check for network errors
      if (!err.status) {
        dispatch(setError('Network error. Please check your connection and try again.'));
      } else if (err.status === 401) {
        dispatch(setError('Invalid username or password. Please try again.'));
      } else {
        dispatch(setError(err.data?.detail || err.error || err.message || 'Login failed. Please try again.'));
      }
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="username" className="block text-[#1E3A8A] text-sm font-semibold">
          Email or Username <span className="text-red-500">*</span>
        </label>
        <input
          id="username"
          name="username"
          type="text"
          required
          value={formData.username}
          onChange={handleChange}
          className="w-full p-3 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14B8A6] text-[#1E3A8A] text-sm shadow-sm transition-all duration-300"
          placeholder="Enter your email or username"
        />
      </div>
      
      <div className="space-y-2">
        <label htmlFor="password" className="block text-[#1E3A8A] text-sm font-semibold">
          Password <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            value={formData.password}
            onChange={handleChange}
            className="w-full p-3 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14B8A6] text-[#1E3A8A] text-sm shadow-sm transition-all duration-300"
            placeholder="Enter your password"
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#1E3A8A] hover:text-[#14B8A6]"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5 opacity-70" />
            ) : (
              <Eye className="h-5 w-5 opacity-70" />
            )}
          </button>
        </div>
      </div>
      
      <div className="flex justify-end">
        <Link
          to="/forgot-password"
          className="text-sm text-[#14B8A6] hover:text-[#14B8A6]/80 transition-colors"
        >
          Forgot Password?
        </Link>
      </div>
      
      <div>
        <button
          type="submit"
          disabled={isLoading || isLoadingCompanyDetails}
          className="w-full py-3 bg-[#14B8A6] text-white rounded-lg hover:bg-[#14B8A6]/90 focus:ring-4 focus:ring-[#14B8A6]/50 text-sm font-semibold shadow-sm transition-all duration-300 disabled:bg-[#14B8A6]/50"
        >
          {isLoading || isLoadingCompanyDetails ? 'Signing in...' : 'Sign In'}
        </button>
      </div>
    </form>
  );
};

export default LoginForm;