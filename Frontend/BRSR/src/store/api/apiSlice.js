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
      query: (plant) => {
        // If no plant is provided, skip the query
        if (!plant?.id) {
          return { skip: true };
        }
        return {
          url: `/environment/reports/get`,
          method: 'POST',
          body: {
            plant_id: plant.id,  // Use plant.id instead of plant_id
            financial_year: "2024-2025"  // Hardcoded as requested
          }
        };
      },
      transformResponse: (response) => {
        console.log('🌍 Environment Reports Response:', response);
        return response ? [response] : []; // Wrap single report in array to maintain compatibility
      },
      transformErrorResponse: (response) => {
        console.error('🔴 Environment Reports Error:', response);
        return response;
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
      queryFn: async (
        { questionId, questionTitle, updatedData, financialYear, moduleId },
        { dispatch, getState },
        extraOptions,
        baseQuery
      ) => {
        try {
          console.log('🔄 Updating answer for question:', questionId, 'with data:', updatedData);

          // Re-use existing array cleaning logic so backend gets string values
          let cleanedData = updatedData;
          if (Array.isArray(updatedData)) {
            // Single table data (no table_key)
            if (
              updatedData.length > 0 &&
              'row_index' in updatedData[0] &&
              !('table_key' in updatedData[0])
            ) {
              cleanedData = updatedData.map(({ row_index, ...rest }) => {
                const stringified = {};
                Object.entries(rest).forEach(([k, v]) => {
                  stringified[k] = v === null ? '' : String(v);
                });
                return stringified;
              });
            }
            // Multi-table data (has table_key)
            else if (updatedData.length > 0 && 'table_key' in updatedData[0]) {
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
          }

          /* ----------------------------------------------------------
           * Dynamic (module-specific) flow
           * ----------------------------------------------------------*/
          if (moduleId) {
            const payload = {
              questionId,
              questionTitle,
              value: cleanedData,
              lastUpdated: new Date().toISOString(),
            };

            const { auth } = getState();
            const companyId = auth.user?.company_id;

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
            } catch (err) {
              // Continue to create if 404; rethrow others
              if (!err?.status || err.status !== 404) {
                console.error('❌ Error fetching existing answer:', err);
                throw err;
              }
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

            const putRes = await baseQuery({
              url: `/module-answers/${moduleId}/${companyId}/${financialYear}`,
              method: 'PUT',
              body: {
                answers: {
                  [questionId]: payload,
                },
              },
            });

            return { data: putRes.data ?? postRes.data };
          }

          /* ----------------------------------------------------------
           * Environment (legacy) flow
           * ----------------------------------------------------------*/
          const envRes = await baseQuery({
            url: `/environment/reports/${financialYear}/table-answer`,
            method: 'POST',
            body: {
              questionId,
              questionTitle,
              updatedData: cleanedData,
            },
          });

          return { data: envRes.data };
        } catch (error) {
          console.error('❌ Error updating answer:', error);
          return { error };
        }
      },
      invalidatesTags: (result, error, arg) => [
        'EnvironmentReports',
        'ModuleAnswers',
        {
          type: 'ModuleAnswers',
          id: `${arg.moduleId}-${result?.data?.company_id}-${arg.financialYear}`,
        },
      ],
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
      query: (payload) => {
        console.log('Received payload:', payload);
        
        // Use static plant ID
        const plantId = "909eb785-6606-4588-80d9-b7d6e5ef254e";

        // Extract the text value from whatever form it comes in
        let answerText = '';
        if (typeof payload === 'string') {
          answerText = payload;
        } else if (payload?.data?.text) {
          answerText = payload.data.text;
        } else if (payload?.text) {
          answerText = payload.text;
        } else if (typeof payload === 'object') {
          answerText = String(payload.updatedData?.text || payload.data || payload.text || '');
        }

        // Construct the payload to match the backend model
        const requestBody = {
          questionId: payload.questionId,
          questionTitle: payload.questionTitle,
          type: 'subjective',
          data: {
            text: answerText
          },
          plant_id: plantId,
          financial_year: "2024-2025"
        };

        console.log('Sending request body:', requestBody);

        return {
          url: '/environment/subjective-answer',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: requestBody
        };
      },
      transformErrorResponse: (response) => {
        console.error('🔴 Subjective Answer Update Error:', response);
        return response;
      },
      invalidatesTags: ['EnvironmentReports']
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
    submitQuestionAnswer: builder.mutation({
      query: ({ questionId, answerData }) => {
        if (!questionId) throw new Error('Question ID is required');
        if (!answerData || typeof answerData !== 'object') throw new Error('Answer data is required and must be an object');

        let company_id = localStorage.getItem("company_id");
        let financial_year = localStorage.getItem("financial_year");

        // Fallback: derive from stored user object or selectedReport if not individually set
        if (!company_id) {
          try {
            const userData = JSON.parse(localStorage.getItem('user') || '{}');
            company_id = company_id || userData.company_id;
          } catch (_) { /* ignore parse errors */ }
        }
        if (!financial_year) {
          try {
            const selectedReport = JSON.parse(localStorage.getItem('selectedReport') || '{}');
            financial_year = selectedReport.financial_year || selectedReport.year || selectedReport.financialYear;
          } catch (_) { /* ignore */ }
        }
        
        

        if (!company_id || !financial_year) {
          throw new Error('Missing required context: company_id or financial_year');
        }

        const questionUpdate = {
          question_id: questionId,
          response: answerData
        };

        return {
          url: `/company/${company_id}/reportsNew/${financial_year}`,
          method: 'PATCH',
          body: [questionUpdate],
          headers: {
            'Content-Type': 'application/json',
          }
        };
      },
      transformResponse: (response) => {
        console.log('📥 Answer submission response:', response);
        return response;
      },
      async onQueryStarted({ questionId }, { queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          console.log('✅ Question answer submitted successfully for:', questionId, data);
        } catch (error) {
          console.error('❌ Error submitting question answer for:', questionId, error);
        }
      }
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
  useUpdateTableAnswerMutation,
  useCreatePlantMutation,
  useDeletePlantMutation,
  useUpdateSubjectiveAnswerMutation,
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