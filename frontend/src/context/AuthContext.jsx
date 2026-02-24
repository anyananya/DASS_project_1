import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [forceChangeRequired, setForceChangeRequired] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    const savedRole = localStorage.getItem('role');
    
    if (token && savedRole) {
      try {
        const response = await authAPI.getMe();
        setUser(response.data.user);
        setRole(response.data.role);
          setForceChangeRequired(!!response.data.user?.forceChangeRequired || false);
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('role');
      }
    }
    setLoading(false);
  };

  const login = async (email, password, role) => {
    try {
      const response = await authAPI.login({ email, password, role });
      const { token, user, forceChangeRequired } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('role', user.role);
      // store whether a forced password change is required
      if (forceChangeRequired) {
        localStorage.setItem('forceChangeRequired', 'true');
      } else {
        localStorage.removeItem('forceChangeRequired');
      }

      setUser(user);
      setRole(user.role);
      setForceChangeRequired(!!forceChangeRequired);
      
      toast.success('Login successful!');
      return { role: user.role, forceChangeRequired: !!forceChangeRequired };
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      toast.error(message);
      throw error;
    }
  };

  const register = async (data) => {
    try {
      const response = await authAPI.register(data);
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('role', user.role);
      
      setUser(user);
      setRole(user.role);
      
      toast.success('Registration successful!');
      return user.role;
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      toast.error(message);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('forceChangeRequired');
    setUser(null);
    setRole(null);
    toast.success('Logged out successfully');
  };

  return (
    <AuthContext.Provider value={{ user, setUser, role, loading, forceChangeRequired, setForceChangeRequired, login, register, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};