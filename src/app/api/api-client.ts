import axios from "axios";

const pythonApi = process.env.NEXT_PUBLIC_PYTHON_API_URL;

export const api = axios.create({
  baseURL: pythonApi,
});

// Optional: response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error:", error.response?.data || error.message);
    return Promise.reject(error);
  }
);