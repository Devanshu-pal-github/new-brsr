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
    createPlant: builder.mutation({
      query: (plantData) => ({
        url: '/plants/create',
        method: 'POST',
        body: plantData
      }),
      transformResponse: (response) => {
        console.log('🌱 Create Plant Response:', response);
        return response;
      },
      invalidatesTags: ['Plants']
    }),
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
    }),
    getQuestionsByIds: builder.query({
      query: ({ questionIds, categoryId }) => ({
        url: `/questions/batch`,
        method: 'POST',
        body: { 
          question_ids: questionIds, 
          category_id: categoryId,
          include_category: true
        }
      }),
      transformResponse: (response) => {
        console.log('📝 Questions Batch Response:', response);
        return Array.isArray(response) ? response : [];
      },
      transformErrorResponse: (response) => {
        console.error('🔴 Questions Batch Error:', response);
        return response;
      },
      providesTags: (result) =>
        result
          ? [
            ...result.map(({ id }) => ({ type: 'Questions', id })),
            { type: 'Questions', id: 'LIST' },
          ]
          : [{ type: 'Questions', id: 'LIST' }],
    }),
    updateTableAnswer: builder.mutation({
      query: (payload) => {
        console.log('Received payload:', payload);
        const { financialYear, questionId, questionTitle, updatedData } = payload;

        // Process data based on structure
        let cleanedData = updatedData;

        // Convert all values to strings to match backend expectations
        if (Array.isArray(updatedData)) {
          // For single table data
          if (updatedData.length > 0 && 'row_index' in updatedData[0] && !('table_key' in updatedData[0])) {
            cleanedData = updatedData.map(({ row_index, ...rest }) => {
              // Convert all values to strings
              const stringifiedData = {};
              Object.entries(rest).forEach(([key, value]) => {
                stringifiedData[key] = value === null ? '' : String(value);
              });
              return stringifiedData;
            });
          } 
          // For multi-table data
          else if (updatedData.length > 0 && 'table_key' in updatedData[0]) {
            cleanedData = updatedData.map(item => {
              const result = { ...item };
              // Convert current_year and previous_year to strings
              if (result.current_year !== undefined) {
                result.current_year = result.current_year === null ? '' : String(result.current_year);
              }
              if (result.previous_year !== undefined) {
                result.previous_year = result.previous_year === null ? '' : String(result.previous_year);
              }
              return result;
            });
          }
        }

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
  useGetQuestionsByIdsQuery,
  useLazyGetQuestionsByIdsQuery,
  useUpdateTableAnswerMutation,
  useCreatePlantMutation
} = apiSlice;

export default apiSlice;