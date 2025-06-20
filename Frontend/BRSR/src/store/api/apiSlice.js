import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { loginPending, loginFulfilled, loginRejected } from '../slices/authSlice';

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
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          dispatch(loginPending());
          const { data } = await queryFulfilled;
          dispatch(loginFulfilled(data));
        } catch (error) {
          dispatch(loginRejected(error));
        }
      }
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
    deletePlant: builder.mutation({
      query: (plantId) => ({
        url: `/plants/${plantId}`,
        method: 'DELETE'
      }),
      transformResponse: (response) => {
        console.log('🗑️ Delete Plant Response:', response);
        return response;
      },
      invalidatesTags: ['Plants']
    }),
    getCompanyReports: builder.query({
      query: (params = {}) => {
        const { plantId, financialYear = "2024-2025" } = params;
        return {
          url: `/environment/reports/get`,
          method: 'POST',
          body: {
            plant_id: plantId || null,
            financial_year: financialYear
          }
        };
      },
      transformResponse: (response) => {
        console.log('🌍 Raw Environment Reports Response:', response);
        
        // If no response, return empty array
        if (!response) return [];

        // Transform the response to include required fields
        const transformedResponse = {
          ...response,
          answers: Object.entries(response.answers || {}).reduce((acc, [questionId, answer]) => {
            acc[questionId] = {
              questionId,
              questionTitle: answer.questionTitle || '',
              type: answer.type || 'subjective',
              data: answer.updatedData || answer.data || { text: '' }
            };
            return acc;
          }, {})
        };

        console.log('🌍 Transformed Response:', transformedResponse);
        return [transformedResponse];
      },
      transformErrorResponse: (response) => {
        console.error('🔴 Environment Reports Error:', response);
        return response;
      },
      providesTags: (result) => {
        if (!result) return ['EnvironmentReport'];
        return [
          'EnvironmentReport',
          ...Object.keys(result[0]?.answers || {}).map(questionId => ({
            type: 'EnvironmentReport',
            id: questionId
          }))
        ];
      }
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

    
    updateQuestionAnswer: builder.mutation({
      queryFn: async (
        { questionId, questionTitle, updatedData, financialYear, plantId },
        { dispatch, getState },
        extraOptions,
        baseQuery
      ) => {
        try {
          console.log('🔄 Updating answer for question:', questionId, 'with data:', updatedData);

          // Clean updatedData based on its structure
          let cleanedData = updatedData;

          // Subjective question data (plain object, not an array)
          if (!Array.isArray(updatedData) && typeof updatedData === 'object' && updatedData !== null) {
            const { table_key, ...rest } = updatedData;
            cleanedData = {};
            Object.entries(rest).forEach(([k, v]) => {
              cleanedData[k] = v === null ? '' : String(v);
            });
          }
          // Table question data (array with table_key)
          else if (Array.isArray(updatedData) && updatedData.length > 0 && 'table_key' in updatedData[0]) {
            cleanedData = updatedData.map((item) => {
              const res = { ...item };
              if (res.current_year !== undefined) {
                res.current_year = res.current_year === null ? '' : String(res.current_year);
              }
              if (res.previous_year !== undefined) {
                res.previous_year = res.previous_year === null ? '' : String(res.previous_year);
              }
              return res;
            });
          }

          /* ----------------------------------------------------------
           * Module-specific flow
           * ----------------------------------------------------------*/
          if (moduleId) {
            if (!moduleId) {
              throw new Error('Module ID is required for updating answers');
            }

            const payload = {
              questionId,
              questionTitle: questionTitle || questionId, // Use questionId as title if not provided
              value: cleanedData,
              lastUpdated: new Date().toISOString(),
            };

            const { auth } = getState();
            const companyId = auth.user?.company_id;

            if (!companyId) {
              throw new Error('Company ID is required but not available');
            }

            if (!financialYear) {
              throw new Error('Financial year is required but not provided');
            }

            console.log('🔑 Module flow with:', {
              moduleId,
              companyId,
              financialYear,
              payload,
            });

            try {
              // Check if a document already exists
              const getRes = await baseQuery({
                url: `/module-answers/${moduleId}/${companyId}/${financialYear}`,
                method: 'GET',
              });

              if (getRes.data) {
                // Update existing
                const putRes = await baseQuery({
                  url: `/module-answers/${moduleId}/${companyId}/${financialYear}`,
                  method: 'PUT',
                  body: {
                    answers: {
                      [questionId]: payload,
                    },
                  },
                });
                return { data: putRes.data };
              }

              // Create new then update
              const postRes = await baseQuery({
                url: `/module-answers/${moduleId}`,
                method: 'POST',
                body: {
                  company_id: companyId,
                  financial_year: financialYear,
                  answers: {
                    [questionId]: payload,
                  },
                },
              });

              if (postRes.error) {
                console.error('Error creating module answer:', postRes.error);
                throw new Error(postRes.error.data?.detail || 'Failed to create module answer');
              }

              const putRes = await baseQuery({
                url: `/module-answers/${moduleId}/${companyId}/${financialYear}`,
                method: 'PUT',
                body: {
                  answers: {
                    [questionId]: payload,
                  },
                },
              });

              if (putRes.error) {
                console.error('Error updating module answer:', putRes.error);
                throw new Error(putRes.error.data?.detail || 'Failed to update module answer');
              }

              return { data: putRes.data ?? postRes.data };
            } catch (error) {
              console.error('Error in module answer flow:', error);
              throw error;
            }
          }

          /* ----------------------------------------------------------
           * Environment (legacy) flow - keeping for backward compatibility
           * ----------------------------------------------------------*/
          const envRes = await baseQuery({
            url: `/environment/table-answer`,
            method: 'POST',
            body: {
              questionId,
              questionTitle,
              updatedData: cleanedData,
              plant_id: plantId,
              financial_year: financialYear || "2024-2025"
            },
          });

          return { data: envRes.data };
        } catch (error) {
          console.error('❌ Error updating answer:', error);
          return { error };
        }
      },
      invalidatesTags: ['EnvironmentReport']
    }),
    getModuleAnswer: builder.query({
      query: ({ moduleId, companyId, financialYear }) => ({
        url: `/module-answers/${moduleId}/${companyId}/${financialYear}`,
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
        { type: 'ModuleAnswers', id: `${arg.moduleId}-${arg.companyId}-${arg.financialYear}` }
      ]
    }),
    
    updateSubjectiveAnswer: builder.mutation({
      query: ({ questionId, questionTitle, type, data, plantId, financialYear }) => ({
        
        url: `/environment/subjective-answer`,
        method: 'POST',
        body: {
          questionId,
          questionTitle,
          type,
          data,
          plant_id: plantId,
          financial_year: financialYear || "2024-2025"
        }
      }),
      invalidatesTags: ['EnvironmentReport']
    }),
    updateAuditStatus: builder.mutation({
      query: ({ financialYear, questionId, audit_status }) => ({
        url: `/environment/reports/${financialYear}/audit-status/${questionId}`,
        method: 'PUT',
        body: { audit_status: Boolean(audit_status) }
      }),
      invalidatesTags: ['EnvironmentReports']
    }),
    getPlantEmployees: builder.query({
      query: (data) => ({
        url: '/plants/employees',
        method: 'POST',
        body: {
          plant_id: data.plant_id
        }
      }),
      providesTags: ['PlantEmployees']
    }),
    createEmployee: builder.mutation({
      query: (data) => ({
        url: '/auth/register',
        method: 'POST',
        body: data
      }),
      invalidatesTags: ['PlantEmployees']
    }),
    generateText: builder.mutation({
      query: ({ message, context }) => ({
        url: '/api/generate',
        method: 'POST',
        body: { message, context },
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        }
      }),
      transformResponse: (response) => {
        console.log('📥 Generate Text Response:', response);
        if (response?.text) {
          return response.text;
        }
        throw new Error('No text found in response');
      },
      async onQueryStarted(arg, { queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          console.log('✅ Text generated successfully:', data);
        } catch (error) {
          console.error('❌ Error generating text:', error);
        }
      }
    }),
    storeQuestionData: builder.mutation({
      query: ({ moduleId, questionId, metadata, answer }) => ({
        url: '/questionData',
        method: 'POST',
        body: {
          moduleId,
          questionId,
          metadata,
          answer,
        },
        headers: {
          'Content-Type': 'application/json',
        }
      }),
      async onQueryStarted({ moduleId, questionId, metadata, answer }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          console.log('✅ Stored question data in backend:', data);
        } catch (error) {
          console.error('❌ Error storing question data in backend:', error);
        }
      }
    }),
    createModuleAnswer: builder.mutation({
      query: ({ moduleId, companyId, financialYear, answers = {} }) => ({
        url: `/module-answers/${moduleId}`,
        method: 'POST',
        body: {
          company_id: companyId,
          financial_year: financialYear,
          answers,
        },
        headers: {
          'Content-Type': 'application/json',
        },
      }),
      transformResponse: (response) => {
        console.log('🆕 [apiSlice] Module answer created:', response);
        return response;
      },
      transformErrorResponse: (response) => {
        console.error('❌ [apiSlice] Error creating module answer:', response);
        return response;
      },
      invalidatesTags: ['ModuleAnswers'],
    }),

    submitQuestionAnswer: builder.mutation({
      query: ({ moduleId, questionId, answerData }) => {
        console.log('🔍 [apiSlice] submitQuestionAnswer called with:', { moduleId, questionId, answerData });
        
        // Enhanced validation with detailed logging
        if (!moduleId) {
          console.error('❌ [apiSlice] Missing moduleId for submitQuestionAnswer');
          throw new Error('Module ID is required but not provided');
        }
        
        if (!questionId) {
          console.error('❌ [apiSlice] Missing questionId for submitQuestionAnswer');
          throw new Error('Question ID is required but not provided');
        }
        
        if (!answerData) {
          console.error('❌ [apiSlice] Missing answerData for submitQuestionAnswer');
          throw new Error('Answer data is required but not provided');
        }

        let company_id = localStorage.getItem("company_id");
        let financial_year = localStorage.getItem("financial_year");

        console.log('🔍 [apiSlice] Initial values from localStorage:', { company_id, financial_year });

        // Fallback: derive from stored user object or selectedReport if not individually set
        if (!company_id) {
          try {
            const userData = JSON.parse(localStorage.getItem('user') || '{}');
            company_id = userData.company_id;
            console.log('🔍 [apiSlice] Retrieved company_id from user data:', company_id);
            
            // Store it back to localStorage for future use
            if (company_id) {
              localStorage.setItem('company_id', company_id);
              console.log('🔍 [apiSlice] Stored company_id in localStorage:', company_id);
            }
          } catch (err) { 
            console.error('❌ [apiSlice] Error parsing user data:', err);
          }
        }
        
        if (!financial_year) {
          try {
            const selectedReport = JSON.parse(localStorage.getItem('selectedReport') || '{}');
            financial_year = selectedReport.financial_year || selectedReport.year || selectedReport.financialYear;
            console.log('🔍 [apiSlice] Retrieved financial_year from selectedReport:', financial_year);
            
            // Store it back to localStorage for future use
            if (financial_year) {
              localStorage.setItem('financial_year', financial_year);
              console.log('🔍 [apiSlice] Stored financial_year in localStorage:', financial_year);
            }
          } catch (err) { 
            console.error('❌ [apiSlice] Error parsing selectedReport:', err);
          }
        }
        
        if (!company_id || !financial_year) {
          console.error('❌ [apiSlice] Missing required context after fallbacks:', { company_id, financial_year });
          throw new Error('Missing required context: company_id or financial_year');
        }

        console.log('📤 [apiSlice] Submitting answer for question:', questionId, 'in module:', moduleId);
        console.log('📤 [apiSlice] Using company_id:', company_id, 'and financial_year:', financial_year);
        console.log('📤 [apiSlice] Answer data:', answerData);

        // Format the payload for the module_answer API
        const payload = {
          questionId,
          questionTitle: questionId, // Using questionId as title if not provided
          value: answerData,
          lastUpdated: new Date().toISOString(),
        };

        console.log('📤 [apiSlice] Formatted payload:', payload);
        console.log('📤 [apiSlice] PUT URL:', `/module-answers/${moduleId}/${company_id}/${financial_year}`);

        return {
          url: `/module-answers/${moduleId}/${company_id}/${financial_year}`,
          method: 'PUT',
          body: {
            answers: {
              [questionId]: payload,
            },
          },
          headers: {
            'Content-Type': 'application/json',
          }
        };
      },
      transformResponse: (response, meta, arg) => {
        console.log('📥 [apiSlice] Answer submission response:', response);
        console.log('📥 [apiSlice] Response meta:', meta);
        return response;
      },
      transformErrorResponse: (response, meta, arg) => {
        console.error('❌ [apiSlice] Error response:', response);
        console.error('❌ [apiSlice] Error meta:', meta);
        return response;
      },
      async onQueryStarted({ moduleId, questionId, answerData }, { dispatch, queryFulfilled }) {
        console.log('🔄 [apiSlice] Starting query for question:', questionId, 'in module:', moduleId);
        try {
          const { data } = await queryFulfilled;
          console.log('✅ [apiSlice] Question answer submitted successfully:', data);
          
          // Invalidate relevant tags to refresh data
          dispatch(apiSlice.util.invalidateTags(['ModuleAnswers']));
          return data; // Return data for chaining
        } catch (error) {
          console.error('❌ [apiSlice] Error submitting question answer:', error);
          console.error('❌ [apiSlice] Error details:', {
            message: error.message,
            status: error.status,
            data: error.data,
            stack: error.stack
          });

          // Check if it's a 404 error
          if (error.status === 404 || (error.error && error.error.status === 404)) {
            console.log('📝 [apiSlice] 404 Error detected. Attempting to create the module answer.');
            try {
              // Fetch required parameters from localStorage if not provided
              let company_id = localStorage.getItem('company_id');
              let financial_year = localStorage.getItem('financial_year');

              if (!company_id || !financial_year) {
                console.error('❌ [apiSlice] Missing company_id or financial_year for POST request');
                throw new Error('Required parameters for creating module answer are missing');
              }

              console.log('📝 [apiSlice] Creating module answer with POST request...');

              // Use fetch to make a POST request to create the module answer
              const createResult = await dispatch(
                apiSlice.endpoints.createModuleAnswer.initiate({
                  moduleId,
                  companyId: company_id,
                  financialYear: financial_year,
                  answers: {}
                })
              );

              if (createResult.error) {
                console.error('❌ [apiSlice] Error creating module answer:', createResult.error);
                throw createResult.error;
              }

              console.log('✅ [apiSlice] Module answer created successfully:', createResult.data);

              // Retry the original PUT request after creation
              console.log('🔄 [apiSlice] Retrying PUT request after creation...');
              const updateResult = await dispatch(
                apiSlice.endpoints.submitQuestionAnswer.initiate({
                  moduleId,
                  questionId,
                  answerData
                })
              );
              
              console.log('✅ [apiSlice] Updated after creation:', updateResult);
              dispatch(apiSlice.util.invalidateTags(['ModuleAnswers']));
            } catch (fetchError) {
              console.error('❌ [apiSlice] Error in fetch operations:', fetchError);
              throw fetchError;
            }
          } else {
            throw error; // Re-throw other errors
          }
        }
      },
    }),
    getAuditLog: builder.query({
      query: () => '/audit/',
      transformResponse: (response) => {
        console.log('📋 Audit Log Response:', response);
        return response;
      },
      transformErrorResponse: (response) => {
        console.error('🔴 Audit Log Error:', response);
        return response;
      },
      providesTags: ['AuditLog']
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
  useUpdateQuestionAnswerMutation: useUpdateTableAnswerMutation, // Aliasing updateQuestionAnswer to useUpdateTableAnswerMutation
  useCreatePlantMutation,
  useDeletePlantMutation,
  useUpdateSubjectiveAnswerMutation,
  useCreateModuleAnswerMutation,
  useLazyGetModuleAnswerQuery,
  useGetPlantEmployeesQuery,
  useCreateEmployeeMutation,
  useGenerateTextMutation,
  useStoreQuestionDataMutation,
  useSubmitQuestionAnswerMutation,
  useGetAuditLogQuery,
  useUpdateAuditStatusMutation
} = apiSlice;
export default apiSlice;
