import styles from './table.module.css';
import type { Column } from '../../types/components';
import { CheckBox } from '../form/checkbox/checkbox';
import Button from '../buttons/button';

interface RowProps<T extends { ID: number; URL: string }> {
  row: T;
  columns: Column<T>[];
  action?: {
    selectAction: (params: T, e?: React.ChangeEvent<HTMLInputElement>) => void;
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
    <tr key={row.ID} className={styles.tr}>
      {canDelete && (
        <td className={styles.td}>
          <CheckBox
            value={row.URL}
            onChange={(e) => action?.selectAction(row, e)}
            checked={isSelected}
          />
        </td>
      )}

      {columns.map((col) => {
        const cellValue = row[col.key];

        return (
          <td key={String(col.key)} className={styles.td}>
            {col.render
              ? col.render(cellValue, row)
              : String(cellValue ? cellValue : '-')}
          </td>
        );
      })}

      <td>
        <Button
          title="View"
          type="button"
          onClick={() => action?.navigateAction(row)}
        />
      </td>
    </tr>
  );
};
