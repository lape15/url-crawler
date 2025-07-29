import styles from './checkbox.module.css';

type CheckBoxProps<T extends string | number | boolean> = {
  label?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  checked: boolean;
  value: T;
  //   onClick?: () => void;
};

export const CheckBox = (props: CheckBoxProps<string>) => {
  const { label, onChange, checked, value } = props;
  return (
    <div className={styles.checkBox}>
      <label htmlFor="check">{label}</label>
      <input
        type="checkbox"
        id="check"
        value={value}
        checked={checked}
        onChange={onChange}
      />
      <div />
    </div>
  );
};
