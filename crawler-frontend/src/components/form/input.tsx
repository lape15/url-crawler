import styles from './form.module.css';

type InputProps = {
  type: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  value: string;
  placeholder: string;
  label: string;
  name: string;
  className?: string;
  helpText?: string;
};

const Input = (props: InputProps) => {
  const {
    type,
    onChange,
    value,
    placeholder,
    name,
    label,
    className,
    helpText,
  } = props;
  return (
    <div className={styles.fieldWrapper}>
      {label && <label className={styles.label}>{label}</label>}
      <input
        type={type}
        onChange={onChange}
        value={value}
        placeholder={placeholder}
        className={[styles.input, className].join(' ')}
        name={name}
      />
      {helpText && <p className={styles.helpText}>{helpText}</p>}
    </div>
  );
};

export default Input;
