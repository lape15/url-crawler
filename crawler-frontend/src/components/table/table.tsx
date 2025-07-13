import styles from './table.module.css';
import type { Column } from '../../types/components';

interface TableProps<T extends { ID: number }> {
  data: T[];
  columns: Column<T>[];
}

export function Table<T extends { ID: number }>({
  data,
  columns,
}: TableProps<T>) {
  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead className={styles.thead}>
          <tr>
            {columns.map((col) => (
              <th key={String(col.key)} className={styles.th}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.ID} className={styles.tr}>
              {columns.map((col) => {
                const cellValue = row[col.key];
                return (
                  <td key={String(col.key)} className={styles.td}>
                    {col.render
                      ? col.render(cellValue, row)
                      : String(cellValue ?? '')}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
