import { useId, useRef } from 'react';
import styles from './checkbox.module.css';

type CheckBoxProps<T extends string | number | boolean> = {
  label?: string;
  onChange: (e?: React.ChangeEvent<HTMLInputElement>) => void;
  checked: boolean;
  value: T;
};

export const CheckBox = (props: CheckBoxProps<string>) => {
  const { label, onChange, checked, value } = props;
  const id = useId();
  const ref = useRef<HTMLInputElement>(null);

  return (
    <div className={styles.checkBox}>
      {label && <label htmlFor={id}>{label}</label>}

      <input
        type="checkbox"
        id={id}
        value={value}
        checked={checked}
        onChange={onChange}
        ref={ref}
      />
      <div
        className={styles.checkItem}
        onClick={() => {
          ref.current?.click();
        }}
      />
    </div>
  );
};
