export interface Column<T> {
  key: keyof T;
  header: string;
  // render?: (value: boolean, row: T) => React.ReactNode;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
}
