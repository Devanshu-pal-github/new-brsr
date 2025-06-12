import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const baseUrl = 'http://localhost:8000'; // Adjust based on your backend URL

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
      query: (credentials) => {
        // Check if credentials is FormData
        const isFormData = credentials instanceof FormData;
        
        return {
          url: '/auth/login',
          method: 'POST',
          // Don't set Content-Type for FormData, browser will set it with boundary
          body: credentials,
          formData: isFormData,
        };
      },
    }),
    updatePassword: builder.mutation({
      query: (passwordData) => ({
        url: '/auth/users/me',
        method: 'PUT',
        body: { password: passwordData.password },
      }),
    }),
    // Add more endpoints as needed
  }),
});

export const { 
  useLoginMutation,
  useUpdatePasswordMutation 
} = apiSlice;