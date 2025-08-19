import styles from './table.module.css';
import type { Column } from '../../types/components';
import { Row } from './row';
import { CheckBox } from '../form/checkbox/checkbox';
import Button from '../buttons/button';

interface TableProps<T extends { ID: number; URL: string }> {
  data: T[];
  columns: Column<T>[];
  canDelete?: boolean;
  action?: {
    selectAction: (params: T) => void;
    navigateAction: (params: T) => void;
    handleSelectAll: (e?: React.ChangeEvent<HTMLInputElement>) => void;
    deleteSelectedUrls?: () => void;
  };
  selected: Map<string, string>;
}

export function Table<T extends { ID: number; URL: string }>({
  data,
  columns,
  canDelete = false,
  action,
  selected,
}: TableProps<T>) {
  return (
    <div className={styles.tableWrapper}>
      {selected.size > 0 && (
        <Button
          title="Delete"
          type="button"
          disabled={selected.size === 0}
          onClick={action?.deleteSelectedUrls}
        />
      )}
      <table className={styles.table}>
        <thead className={styles.thead}>
          <tr>
            {canDelete && (
              <th>
                <CheckBox
                  onChange={(e) => action?.handleSelectAll(e)}
                  checked={selected.size > 0}
                  value=""
                />
              </th>
            )}

            {columns.map((col) => (
              <th key={String(col.key)} className={styles.th}>
                {col.header}
              </th>
            ))}

            {/* <th>Status</th> */}
          </tr>
        </thead>

        <tbody>
          {data.map((row) => (
            <Row
              key={row.ID}
              row={row}
              columns={columns}
              action={action}
              canDelete={canDelete}
              isSelected={selected.has(row.URL)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
