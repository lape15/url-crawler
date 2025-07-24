import { useMemo } from 'react';
import { Chart, type AxisOptions } from 'react-charts';
type LinkDatum = { primary: number; date: Date };
type ChartDatum<TDatum> = {
  label: string;
  data: TDatum[];
};
type ChartProps = {
  data: ChartDatum<LinkDatum>[];
};

export const ChartComponent = (props: ChartProps) => {
  const { data } = props;
  const primaryAxis = useMemo(
    (): AxisOptions<LinkDatum> => ({
      getValue: (datum) => datum.date,
    }),
    [],
  );
  const secondaryAxes = useMemo(
    (): AxisOptions<LinkDatum>[] => [
      {
        getValue: (datum) => datum.primary,
      },
    ],
    [],
  );
  return (
    <Chart
      options={{
        data,
        primaryAxis,
        secondaryAxes,
        tooltip: true,
      }}
      //   typeof='b'
    />
  );
};
