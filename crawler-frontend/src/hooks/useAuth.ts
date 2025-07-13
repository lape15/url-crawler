import { useMutation } from '@tanstack/react-query';
import { login } from '../services/auth';
import { useNavigate } from 'react-router-dom';
import type { Credential } from '../types/auth';

export const useLogin = () => {
  const navigate = useNavigate();
  return useMutation({
    mutationFn: ({ username, password }: Credential) =>
      login({ username, password }),
    onSuccess: (res) => {
      localStorage.setItem('token', res.data.token);
      navigate('/dashboard');
    },
  });
};

export const useRegister = () => {
  const navigate = useNavigate();
  return useMutation({
    mutationFn: ({ username, password, name }: Credential) =>
      login({ username, password, name }),
    onSuccess: (res) => {
      localStorage.setItem('token', res.data.token);
      navigate('/dashboard');
    },
  });
};
