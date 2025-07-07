import { useMemo, useState } from 'react';
import { useLogin } from '../../hooks/useAuth';
import styles from './auth.module.css';
import Input from '../../components/form/input';
import Button from '../../components/buttons/button';

export function LoginPage() {
  const [loginCredentials, setLoginCredentials] = useState({
    username: '',
    password: '',
  });

  const loginMutation = useLogin();
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(loginCredentials);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoginCredentials((prevCredentials) => ({
      ...prevCredentials,
      [name]: value,
    }));
  };

  const errorField = useMemo(() => {
    const error = loginMutation.error as {
      response?: { data?: { error?: string } };
    };
    return error?.response?.data?.error;
  }, [loginMutation.error]);

  return (
    <div className={styles.formWrapper}>
      <h4>URL Crawler</h4>
      <form onSubmit={handleSubmit}>
        {Object.keys(loginCredentials).map((key) => {
          return (
            <Input
              name={key}
              value={loginCredentials[key as keyof typeof loginCredentials]}
              onChange={handleChange}
              label={key.toUpperCase()}
              type="text"
              placeholder={key.toUpperCase()}
              key={key}
            />
          );
        })}

        <Button
          type="submit"
          disabled={loginMutation.isPending}
          title="Login"
        />

        {errorField && <p className={styles.error}>{errorField}</p>}
      </form>
    </div>
  );
}
