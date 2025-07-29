import styles from './table.module.css';
import type { Column } from '../../types/components';
import { CheckBox } from '../form/checkbox/chexbox';

interface RowProps<T extends { ID: number; URL: string }> {
  row: T;
  columns: Column<T>[];
  action?: {
    selectAction: (params: T) => void;
    navigateAction: (params: T) => void;
  };
  canDelete: boolean;
  isSelected: boolean;
}

export const Row = <T extends { ID: number; URL: string }>(
  props: RowProps<T>,
) => {
  const { row, columns, action, canDelete, isSelected } = props;

  return (
    <tr
      key={row.ID}
      className={styles.tr}
      onClick={() => action?.navigateAction(row)}
    >
      {canDelete && (
        <td className={styles.td}>
          <CheckBox
            value={row.URL}
            onChange={() => action?.selectAction(row)}
            checked={isSelected}
          />
        </td>
      )}

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
