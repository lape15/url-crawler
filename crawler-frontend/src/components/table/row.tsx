import styles from './table.module.css';
import type { Column } from '../../types/components';

interface RowProps<T extends { ID: number }> {
  row: T;
  columns: Column<T>[];
  action: () => void;
}
export const Row = <T extends { ID: number }>(props: RowProps<T>) => {
  const { row, columns, action } = props;
  return (
    <tr key={row.ID} className={styles.tr} onClick={action}>
      {columns.map((col) => {
        const cellValue = row[col.key];
        return (
          <td key={String(col.key)} className={styles.td}>
            {col.render ? col.render(cellValue, row) : String(cellValue ?? '')}
          </td>
        );
      })}
      <td>Done</td>
    </tr>
  );
};
