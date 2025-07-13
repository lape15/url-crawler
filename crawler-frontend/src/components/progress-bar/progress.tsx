import styles from './progress.module.css';
export const ProgressBar = () => {
  return (
    <div className={styles.progress}>
      <div className={styles.progressBar}></div>
    </div>
  );
};
