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
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
        formData: credentials instanceof FormData,
      }),
    }),
    updatePassword: builder.mutation({
      query: (passwordData) => ({
        url: '/auth/users/me',
        method: 'PUT',
        body: { password: passwordData.password },
      }),
    }),
    requestPasswordReset: builder.mutation({
      query: (email) => ({
        url: '/auth/forgot-password',
        method: 'POST',
        body: { email }
      }),
    }),
    resetPassword: builder.mutation({
      query: ({ token, password }) => ({
        url: '/auth/reset-password',
        method: 'POST',
        body: { token, password }
      }),
    }),
    // Add more endpoints as needed
  }),
});

export const { 
  useLoginMutation,
  useUpdatePasswordMutation,
  useRequestPasswordResetMutation,
  useResetPasswordMutation
} = apiSlice;