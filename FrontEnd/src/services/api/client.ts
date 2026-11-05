import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

export const apiClient = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

// Request interceptor: attach bearer token if present
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('mode_studio_token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// Response interceptor: standard response handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Placeholder error handler, can be extended for 401/403/500
    return Promise.reject(error)
  },
)

export default apiClient

