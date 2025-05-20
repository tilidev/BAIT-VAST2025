// lib/axios.ts
import axios from 'axios'

console.log(import.meta.env);

export const api = axios.create({
  baseURL: ('/api'),
  withCredentials: true, // for cookie-based auth
})

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      // Optionally trigger logout
    }
    return Promise.reject(err)
  }
)
