import { axiosInstance } from './axios';

// Function to handle user registration
export const register = async (userData) => {
  try {
    const response = await axiosInstance.post('/api/register/', userData);
    return response.data;
  } catch (error) {
    console.error('Error during registration:', error);
    throw error;
  }
};

// Function to handle user login
export const login = async (credentials) => {
  try {
    const response = await axiosInstance.post('/api/login/', credentials);
    return response.data;
  } catch (error) {
    console.error('Error during login:', error);
    throw error;
  }
};