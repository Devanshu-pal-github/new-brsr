import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { store } from '../store';

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
    // This is a partial update to the apiSlice.js file, focusing only on the updateTableAnswer mutation
    
    updateTableAnswer: builder.mutation({
      queryFn: async ({ questionId, questionTitle, updatedData, financialYear, moduleId }, { dispatch, getState }, extraOptions, baseQuery) => {
        try {
          console.log('🔄 Updating answer for question:', questionId, 'with data:', updatedData);
          
          // Process the updatedData to handle null values
          const cleanedData = {};
          
          // Ensure updatedData is an object
          if (updatedData && typeof updatedData === 'object') {
            console.log('🔍 updatedData types before cleaning:', Object.entries(updatedData).map(([key, value]) => `${key}: ${typeof value}`));
            
            // For multi-table data, ensure current_year and previous_year are strings
            if (updatedData.current_year !== undefined || updatedData.previous_year !== undefined) {
              cleanedData.current_year = updatedData.current_year !== undefined ? String(updatedData.current_year) : '';
              cleanedData.previous_year = updatedData.previous_year !== undefined ? String(updatedData.previous_year) : '';
            } else {
              // For other data types, convert null to empty string but preserve boolean values
              Object.keys(updatedData).forEach(key => {
                if (updatedData[key] === null) {
                  cleanedData[key] = '';
                } else if (typeof updatedData[key] === 'boolean') {
                  // Preserve boolean values exactly as they are
                  cleanedData[key] = updatedData[key];
                  console.log(`🔍 Preserving boolean value for ${key}:`, updatedData[key]);
                } else {
                  cleanedData[key] = updatedData[key];
                }
              });
            }
          } else {
            console.warn('⚠️ updatedData is not an object:', updatedData);
          }

          console.log('🧹 Cleaned data:', cleanedData);
          console.log('🔍 cleanedData types after cleaning:', Object.entries(cleanedData).map(([key, value]) => `${key}: ${typeof value}`));

          // Construct the payload
          const payload = {
            questionId,
            questionTitle,
            value: cleanedData,
            lastUpdated: new Date().toISOString()
          };

          console.log('📦 Payload:', payload);

          // If moduleId is provided, use the module-specific endpoint
          if (moduleId) {
            const { auth } = getState();
            const companyId = auth.user?.company_id;
            const plantId = auth.user?.plant_id || 'default';

            console.log('🔑 Using module-specific endpoint with:', { moduleId, companyId, plantId, financialYear });

            // First, try to get the existing answer
            try {
              const getResult = await baseQuery({
                url: `/module-answers/${moduleId}/${companyId}/${plantId}/${financialYear}`,
                method: 'GET'
              });

              console.log('🔍 GET result:', getResult.data);

              // If the answer exists, update it
              if (getResult.data) {
                const putResult = await baseQuery({
                  url: `/module-answers/${moduleId}/${companyId}/${plantId}/${financialYear}`,
                  method: 'PUT',
                  body: {
                    answers: {
                      [questionId]: payload
                    }
                  }
                });
                console.log('✅ Successfully updated answer:', putResult.data);
                return { data: putResult.data };
              }
            } catch (error) {
              // If the answer doesn't exist (404), create a new one
              if (error.status === 404) {
                console.log('🆕 Answer not found, creating new one');
                const postResult = await baseQuery({
                  url: `/module-answers/${moduleId}`,
                  method: 'POST',
                  body: {
                    company_id: companyId,
                    plant_id: plantId,
                    financial_year: financialYear,
                    answers: {
                      [questionId]: payload
                    }
                  }
                });
                
                console.log('✅ Created new answer:', postResult.data);
                
                // Now try to update it
                const putResult = await baseQuery({
                  url: `/module-answers/${moduleId}/${companyId}/${plantId}/${financialYear}`,
                  method: 'PUT',
                  body: {
                    answers: {
                      [questionId]: payload
                    }
                  }
                });
                console.log('✅ Successfully updated answer:', putResult.data);
                return { data: putResult.data };
              }
              console.error('❌ Error updating answer:', error);
              throw error;
            }
          } else {
            // Fall back to the old endpoint if moduleId is not provided
            console.log('⚠️ No moduleId provided, using legacy endpoint');
            const result = await baseQuery({
              url: `/environment/reports/${financialYear}/table-answer`,
              method: 'POST',
              body: payload
            });
            console.log('✅ Successfully saved answer using legacy endpoint:', result.data);
            return { data: result.data };
          }
        } catch (error) {
          console.error('❌ Error updating answer:', error);
          return { error };
        }
      },
      invalidatesTags: (result, error, arg) => [
        'EnvironmentReports', 
        'ModuleAnswers',
        { type: 'ModuleAnswers', id: `${arg.moduleId}-${result?.data?.company_id}-${result?.data?.plant_id}-${arg.financialYear}` }
      ]
    }),
    getModuleAnswer: builder.query({
      query: ({ moduleId, companyId, plantId, financialYear }) => ({
        url: `/module-answers/${moduleId}/${companyId}/${plantId}/${financialYear}`,
        method: 'GET'
      }),
      transformResponse: (response) => {
        console.log('📋 Module Answer Response:', response);
        return response;
      },
      transformErrorResponse: (response) => {
        console.error('🔴 Module Answer Error:', response);
        return response;
      },
      providesTags: (result, error, arg) => [
        { type: 'ModuleAnswers', id: `${arg.moduleId}-${arg.companyId}-${arg.plantId}-${arg.financialYear}` }
      ]
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
  useCreatePlantMutation,
  useGetModuleAnswerQuery,
  useLazyGetModuleAnswerQuery
} = apiSlice;

export default apiSlice;