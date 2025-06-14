import { createSlice } from '@reduxjs/toolkit';

// Get user data from localStorage if available
const getUserFromStorage = () => {
  const userData = localStorage.getItem('user');
  if (!userData) return null;
  try {
    return JSON.parse(userData);
  } catch (error) {
    // If parsing fails, remove the invalid data and return null
    localStorage.removeItem('user');
    return null;
  }
};

// Get token from localStorage if available
const getTokenFromStorage = () => {
  return localStorage.getItem('token') || null;
};

// Get company details from localStorage if available
const getCompanyDetailsFromStorage = () => {
  const companyDetails = localStorage.getItem('companyDetails');
  if (!companyDetails) return null;
  try {
    return JSON.parse(companyDetails);
  } catch (error) {
    // If parsing fails, remove the invalid data and return null
    localStorage.removeItem('companyDetails');
    return null;
  }
};

const initialState = {
  user: getUserFromStorage(),
  token: getTokenFromStorage(),
  isAuthenticated: !!getTokenFromStorage(),
  isLoading: false,
  error: null,
  refreshToken: null,
  tokenType: 'bearer',
  expiresIn: null,
  companyDetails: getCompanyDetailsFromStorage()
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      const { 
        access_token,
        refresh_token,
        token_type,
        expires_in,
        user_id,
        role,
        company_id,
        plant_id,
        user_name
      } = action.payload;

      state.user = {
        id: user_id,
        user_name,
        role,
        company_id,
        plant_id
      };
      state.token = access_token;
      state.refreshToken = refresh_token;
      state.tokenType = token_type;
      state.expiresIn = expires_in;
      state.isAuthenticated = true;
      
      // Store in localStorage
      localStorage.setItem('user', JSON.stringify(state.user));
      localStorage.setItem('token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      localStorage.setItem('user_name', user_name);
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.tokenType = 'bearer';
      state.expiresIn = null;
      state.isAuthenticated = false;
      state.companyDetails = null;
      
      // Remove from localStorage
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user_name');
      localStorage.removeItem('companyDetails');
    },
    setCompanyDetails: (state, action) => {
      state.companyDetails = action.payload;
      localStorage.setItem('companyDetails', JSON.stringify(action.payload));
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    loginPending: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    loginFulfilled: (state, { payload }) => {
      state.isLoading = false;
      state.isAuthenticated = true;
      state.user = {
        id: payload.user_id,
        user_name: payload.user_name,
        role: payload.role,
        company_id: payload.company_id,
        plant_id: payload.plant_id
      };
      state.token = payload.access_token;
      state.refreshToken = payload.refresh_token;
      state.tokenType = payload.token_type;
      state.expiresIn = payload.expires_in;
      
      // Store in localStorage
      try {
        localStorage.setItem('user', JSON.stringify(state.user));
        localStorage.setItem('token', payload.access_token);
        localStorage.setItem('refresh_token', payload.refresh_token);
        localStorage.setItem('user_name', payload.user_name);
      } catch (error) {
        console.error('Error storing authentication data in localStorage:', error);
      }
    },
    loginRejected: (state, { payload, error }) => {
      state.isLoading = false;
      state.error = payload?.detail || error?.message || 'Authentication failed';
    }
  }
});

export const { 
  setCredentials, 
  logout, 
  setError, 
  clearError, 
  setCompanyDetails,
  loginPending,
  loginFulfilled,
  loginRejected
} = authSlice.actions;

export default authSlice.reducer;

// Selectors
export const selectCurrentUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectAuthError = (state) => state.auth.error;
export const selectIsLoading = (state) => state.auth.isLoading;
export const selectUserName = (state) => state.auth.user?.user_name || 'User';
export const selectUserRole = (state) => state.auth.user?.role;
export const selectCompanyId = (state) => state.auth.user?.company_id;
export const selectPlantId = (state) => state.auth.user?.plant_id;
export const selectToken = (state) => state.auth.token;
export const selectRefreshToken = (state) => state.auth.refreshToken;
export const selectTokenExpiration = (state) => state.auth.expiresIn;
export const selectCompanyDetails = (state) => state.auth.companyDetails;