import { useMemo, useState } from 'react';
import { useRegister } from '../../hooks/useAuth';
import styles from './auth.module.css';
import Input from '../../components/form/input';
import Button from '../../components/buttons/button';

export function RegisterPage() {
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
    name: '',
  });
  const registerMutation = useRegister();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate(credentials);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials((prevCredentials) => ({
      ...prevCredentials,
      [name]: value,
    }));
  };

  const errorField = useMemo(() => {
    const error = registerMutation.error as {
      response?: { data?: { error?: string } };
    };
    return error?.response?.data?.error;
  }, [registerMutation.error]);

  return (
    <div>
      <h4>URL Crawler</h4>
      <form onSubmit={handleSubmit} className={styles.formWrapper}>
        {Object.keys(credentials).map((key) => {
          return (
            <Input
              name={key}
              value={credentials[key as keyof typeof credentials]}
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
          disabled={registerMutation.isPending}
          title="Register"
        />
        {errorField && <p className={styles.error}>{errorField}</p>}
      </form>
    </div>
  );
}
