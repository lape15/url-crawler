import type { CrawledURL } from '../types/url';

export const renderData = <T>(value: T) => {
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value);
  }
  return String(value);
};

export const getChartLinkData = (data: CrawledURL) => {
  const chartData = [
    {
      label: 'Internal Links',
      data: [
        {
          primary: data.InternalLinks,
          date: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      ],
    },
    {
      label: 'External Links',
      data: [
        {
          primary: data.ExternalLinks,
          date: new Date(Date.now() + 24 * 60 * 60 * 1001),
        },
      ],
    },
    {
      label: 'Broken Links',
      data: [{ primary: data.BrokenLinks, date: new Date(Date.now()) }],
    },
  ];
  return chartData;
};
