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
           * --------------------------------------------------------*/
          if (moduleId) {
            const payload = {
              questionId,
              questionTitle,
              value: cleanedData,
              lastUpdated: new Date().toISOString(),
            };

            const { auth } = getState();
            const companyId = auth.user?.company_id;
            const plantId = auth.user?.plant_id || 'default';

            console.log('🔑 Module flow with:', {
              moduleId,
              companyId,
              plantId,
              financialYear,
              payload,
            });

            try {
              // Check if a document already exists
              const getRes = await baseQuery({
                url: `/module-answers/${moduleId}/${companyId}/${plantId}/${financialYear}`,
                method: 'GET',
              });

              if (getRes.data) {
                // Update existing
                const putRes = await baseQuery({
                  url: `/module-answers/${moduleId}/${companyId}/${plantId}/${financialYear}`,
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
                plant_id: plantId,
                financial_year: financialYear,
                answers: {
                  [questionId]: payload,
                },
              },
            });

            const putRes = await baseQuery({
              url: `/module-answers/${moduleId}/${companyId}/${plantId}/${financialYear}`,
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
           * --------------------------------------------------------*/
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
          id: `${arg.moduleId}-${result?.data?.company_id}-${result?.data?.plant_id}-${arg.financialYear}`,
        },
      ],
    }), /* duplicate legacy block removed */
        /* Duplicate legacy updateTableAnswer block - commented out during merge
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
*/
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
    updateSubjectiveAnswer: builder.mutation({
      query: (payload) => {
        console.log('Received subjective payload:', payload);
        const { questionId, questionTitle, type, data } = payload;
           
        const financialYear = payload.financialYear; // Hardcoded for now

        return {
          url: `/environment/reports/${financialYear}/subjective-answer`,
          method: 'POST',
          body: {
            questionId,
            questionTitle,
            type,
            data
          }
        };
      },
      transformErrorResponse: (response) => {
        console.error('🔴 Subjective Answer Update Error:', response);
        return response;
      },
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
  useCreateEmployeeMutation
} = apiSlice;

export default apiSlice;