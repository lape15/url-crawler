import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './table.module.css';
import type { Column } from '../../types/components';
import { Row } from './row';

interface TableProps<T extends { ID: number; URL: string }> {
  data: T[];
  columns: Column<T>[];
}

export function Table<T extends { ID: number; URL: string }>({
  data,
  columns,
}: TableProps<T>) {
  const navigate = useNavigate();
  const navigateToUrlPage = useCallback(
    (id: number, url: string) => {
      navigate(`/url/${id}`, {
        state: {
          url,
        },
      });
    },
    [navigate],
  );

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
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <Row
              key={row.ID}
              row={row}
              columns={columns}
              action={() => navigateToUrlPage(row.ID, row.URL)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
