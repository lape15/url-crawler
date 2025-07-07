import { useMutation } from "@tanstack/react-query";
import { login } from "../services/auth";
import type { Credential } from "../types/auth";

export const useLogin = () => {
  return useMutation({
    mutationFn: ({ username, password }: Credential) =>
      login({ username, password }),
    onSuccess: (res) => {
      localStorage.setItem("token", res.data.token);
    },
  });
};

export const useRegister = () => {
  return useMutation({
    mutationFn: ({ username, password, name }: Credential) =>
      login({ username, password, name }),
    onSuccess: (res) => {
      localStorage.setItem("token", res.data.token);
    },
  });
};
