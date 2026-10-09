import axios from 'axios';

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
/**
 * 🌐 Axios Client tập trung cho toàn bộ ứng dụng Frontend
 * Tự động gắn Bearer Token và xử lý mã lỗi HTTP chuẩn mực
 */
export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 60000,
});

// 1. Request Interceptor: Tự động đính kèm JWT Token vào Header của mọi request
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('hr_access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// 2. Response Interceptor: Bóc tách dữ liệu chuẩn TransformInterceptor và bắt lỗi 401
apiClient.interceptors.response.use(
  (response) => {
    // Backend trả về dạng { success: true, statusCode: 200, data: ..., timestamp }
    return response.data?.data !== undefined ? response.data.data : response.data;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('hr_access_token');
      localStorage.removeItem('hr_current_user');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    const message =
      error.response?.data?.message ||
      error.message ||
      'Không thể kết nối tới máy chủ API.';
    return Promise.reject(new Error(message));
  },
);
