import styles from './button.module.css';

type ButtonProps = {
  title: string;
  onClick?: () => void;
  disabled?: boolean;
  type: 'submit' | 'reset' | 'button';
};
const Button = (props: ButtonProps) => {
  const { title, onClick, disabled, type } = props;
  return (
    <div className={styles.buttonWrapper}>
      <button
        className={styles.button}
        disabled={disabled}
        type={type}
        onClick={onClick}
      >
        {title}
      </button>
    </div>
  );
};

export default Button;
