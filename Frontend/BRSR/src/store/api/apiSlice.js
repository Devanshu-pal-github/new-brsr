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

      // For login requests, ensure content type is properly set
      if (headers.get('Content-Type') === 'multipart/form-data') {
        // Remove content-type header for FormData to let the browser set it with the boundary
        headers.delete('Content-Type');
      }

      return headers;
    }
  }),
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (credentials) => {
        // Set up request configuration
        const requestConfig = {
          url: '/auth/login',
          method: 'POST',
          body: credentials,
        };

        // Set appropriate headers for URLSearchParams
        if (credentials instanceof URLSearchParams) {
          requestConfig.headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
          };
        }

        return requestConfig;
      },
    }),
    getCompanyDetails: builder.query({
      query: (userId) => `/auth/users/${userId}/company-details`,
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
    getReportModules: builder.query({
      query: ({ reportId, companyId }) => ({
        url: `/companies/${companyId}/reports/${reportId}/modules`,
        method: 'GET',
      }),
      transformResponse: (response) => {
        console.log('🔵 Raw API Response:', response);
        return Array.isArray(response) ? response : [];
      },
      transformErrorResponse: (response) => {
        console.error('🔴 API Error:', response);
        return response;
      },
      providesTags: (result) =>
        result
          ? [
            ...result.map(({ id }) => ({ type: 'Modules', id })),
            { type: 'Modules', id: 'LIST' },
          ]
          : [{ type: 'Modules', id: 'LIST' }],
      keepUnusedDataFor: 300, // Keep data for 5 minutes
    }),
    getCompanyPlants: builder.query({
      query: (companyId) => ({
        url: `/plants/company/${companyId}`,
        method: 'GET',
      }),
      transformResponse: (response) => {
        console.log('🌿 Plants Response:', response);
        return Array.isArray(response) ? response : [];
      },
      providesTags: ['Plants']
    }),
    // Add more endpoints as needed

    getCompanyReports: builder.query({
      query: () => ({
        url: `/environment/reports`,
        method: 'GET',
      }),
      transformResponse: (response) => {
        console.log('🌍 Environment Reports Response:', response);
        return Array.isArray(response) ? response : [];
      },
      providesTags: (result) =>
        result
          ? [
            ...result.map((report) => ({ type: 'EnvironmentReports', id: report.id })),
            { type: 'EnvironmentReports', id: 'LIST' },
          ]
          : [{ type: 'EnvironmentReports', id: 'LIST' }],
    }),      updateTableAnswer: builder.mutation({
      query: (payload) => {
        console.log('Received payload:', payload);
        const { financialYear, questionId, questionTitle, updatedData } = payload;

        // Process data based on structure
        let cleanedData = updatedData;

        // If it's a simple array of objects with row_index, current_year, previous_year
        if (Array.isArray(updatedData) && updatedData.length > 0 && 'row_index' in updatedData[0] && !('table_key' in updatedData[0])) {
          // For single table data
          cleanedData = updatedData.map(({ current_year, previous_year }) => ({
            current_year: current_year || '',
            previous_year: previous_year || ''
          }));
        }
        // For multi-table and dynamic-table, keep the original structure
        // as it's already processed in QuestionRenderer

        console.log('Sending to backend:', {
          questionId,
          questionTitle,
          updatedData: cleanedData
        });

        return {
          url: `/environment/reports/${financialYear}/table-answer`,
          method: 'POST',
          body: {
            questionId,
            questionTitle,
            updatedData: cleanedData
          }
        };
      },
      transformErrorResponse: (response) => {
        console.error('🔴 Table Answer Update Error:', response);
        return response;
      },
      invalidatesTags: ['EnvironmentReports']
    }),

  }),
});

export const {
  useLoginMutation,
  useGetCompanyDetailsQuery,
  useLazyGetCompanyDetailsQuery,
  useUpdatePasswordMutation,
  useRequestPasswordResetMutation,
  useResetPasswordMutation,
  useGetReportModulesQuery,
  useLazyGetReportModulesQuery,
  useGetCompanyPlantsQuery,
  useGetCompanyReportsQuery,
  useUpdateTableAnswerMutation
} = apiSlice;

export default apiSlice;