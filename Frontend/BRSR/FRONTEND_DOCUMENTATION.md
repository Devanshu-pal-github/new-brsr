# BRSR Frontend Documentation

## Project Overview

This frontend application is built for the BRSR (Business Responsibility and Sustainability Reporting) system. It uses modern React with Redux Toolkit for state management, React Router for navigation, and Tailwind CSS for styling. The UI features glassmorphism and greenish-blue gradients for a professional and modern look.

## Technology Stack

- **React**: UI library
- **Redux Toolkit**: State management
- **React Router DOM**: Routing
- **Axios**: HTTP client (via RTK Query)
- **Tailwind CSS**: Styling

## Folder Structure

```
src/
├── components/           # Reusable UI components
│   ├── auth/            # Authentication related components
│   │   └── LoginForm.jsx
│   └── layout/          # Layout components
│       └── Navbar.jsx
├── pages/               # Page components
│   ├── Login.jsx
│   └── Dashboard.jsx
├── store/               # Redux store setup
│   ├── api/             # API integration
│   │   └── apiSlice.js  # RTK Query API definitions
│   ├── slices/          # Redux slices
│   │   └── authSlice.js # Authentication state management
│   └── store.js         # Redux store configuration
├── App.jsx              # Main application component with routes
├── main.jsx             # Application entry point
└── index.css            # Global styles
```

## Authentication Flow

1. **User Login**:
   - User enters credentials on the Login page
   - LoginForm component dispatches login action
   - API request is made through apiSlice.login mutation
   - On success, authSlice stores user data and token in Redux state and localStorage
   - User is redirected to Dashboard

2. **Protected Routes**:
   - ProtectedRoute component in App.jsx checks for token in localStorage
   - Unauthenticated users are redirected to Login page
   - Authenticated users can access protected routes

3. **Logout**:
   - User clicks Logout in Navbar
   - authSlice.logout action clears user data and token from Redux state and localStorage
   - User is redirected to Login page

## Redux Store Structure

### Store Configuration (store.js)

The central Redux store combines reducers from all slices and configures middleware:

```javascript
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import { apiSlice } from './api/apiSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [apiSlice.reducerPath]: apiSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(apiSlice.middleware),
  devTools: true,
});
```

### API Integration (apiSlice.js)

RTK Query setup for API calls with automatic token handling:

```javascript
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const baseUrl = 'http://localhost:8000'; // Backend URL

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl,
    prepareHeaders: (headers, { getState }) => {
      // Get token from auth state
      const token = getState().auth.token;
      
      // If token exists, add authorization header
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      
      return headers;
    },
  }),
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
    }),
    // Add more endpoints as needed
  }),
});

export const { useLoginMutation } = apiSlice;
```

### Authentication Slice (authSlice.js)

Manages authentication state with reducers for login, logout, and error handling:

```javascript
import { createSlice } from '@reduxjs/toolkit';

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: getUserFromStorage(),
    token: getTokenFromStorage(),
    isAuthenticated: !!getTokenFromStorage(),
    isLoading: false,
    error: null,
  },
  reducers: {
    setCredentials: (state, action) => {
      // Store user data and token
    },
    logout: (state) => {
      // Clear user data and token
    },
    // Other reducers...
  },
  extraReducers: (builder) => {
    // Handle API responses
  },
});
```

## UI Components

### Login Page

Features glassmorphism design with greenish-blue gradient background:

- **Login.jsx**: Container component that handles routing logic
- **LoginForm.jsx**: Form component that handles user input and submission

### Dashboard

Main application page after authentication:

- **Dashboard.jsx**: Main dashboard layout with content
- **Navbar.jsx**: Navigation bar with user info and logout button

## Data Flow

1. **API Request Flow**:
   - Components use RTK Query hooks (e.g., useLoginMutation)
   - API calls are made through apiSlice
   - Responses are automatically cached by RTK Query
   - Authentication token is automatically included in requests

2. **State Management Flow**:
   - User actions trigger Redux actions
   - Reducers update state based on actions
   - Components access state via useSelector hooks
   - Components dispatch actions via useDispatch hook

3. **Authentication State Flow**:
   - Login success → store token in Redux and localStorage
   - App checks token on protected routes
   - Logout → clear token from Redux and localStorage

## Styling

The application uses Tailwind CSS with custom styling for glassmorphism effects and gradients:

- **Glassmorphism**: Achieved with background opacity, backdrop filters, and subtle borders
- **Gradient**: Greenish-blue gradient using Tailwind's from/to classes
- **Responsive Design**: Mobile-first approach with responsive breakpoints

## Best Practices Implemented

1. **Component Structure**: Separation of concerns with container and presentational components
2. **State Management**: Centralized state with Redux Toolkit
3. **API Integration**: RTK Query for efficient API calls with caching
4. **Authentication**: Secure token storage and protected routes
5. **Error Handling**: Comprehensive error handling in API calls and UI feedback
6. **Responsive Design**: Mobile-first approach with Tailwind CSS
7. **Code Organization**: Clear folder structure with logical grouping

## Future Enhancements

1. **Form Validation**: Add form validation library (e.g., Formik, React Hook Form)
2. **Testing**: Add unit and integration tests
3. **Internationalization**: Add multi-language support
4. **Theme Switching**: Add light/dark mode toggle
5. **Performance Optimization**: Implement code splitting and lazy loading