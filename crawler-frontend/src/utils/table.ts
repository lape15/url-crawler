import type { Column } from '../types/components';

const excluded = ['ID', 'UserID'];
export function extractColumnsFromData<T>(data: T[]): Column<T>[] {
  if (!data || data.length === 0) return [];

  const sample = data[0];
  const keys = Object.keys(sample as object) as (keyof T)[];

  const prunedkeys = keys.filter((key) => !excluded.includes(key as string));

  return prunedkeys.map((key) => {
    const readableHeader = key
      .toString()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());

    const isBoolean = typeof sample[key] === 'boolean';

    return {
      key,
      header: readableHeader,
      ...(isBoolean && {
        // render: (val: boolean) => (val ? 'Yes' : 'No'),
        render: (val: T[keyof T]) => {
          if (typeof val === 'boolean') {
            return val ? 'Yes' : 'No';
          }
          return String(val);
        },
      }),
    };
  });
}
