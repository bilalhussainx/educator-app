// src/constants/simulation.ts
export interface HistoricalPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  description: string;
}

export const HISTORICAL_PERIODS: HistoricalPeriod[] = [
  {
    id: 'great-depression',
    name: 'Great Depression',
    startDate: '1929-10-24',
    endDate: '1932-07-08',
    description: 'The worst economic downturn in modern history, starting with Black Thursday'
  },
  {
    id: 'black-monday',
    name: 'Black Monday 1987',
    startDate: '1987-10-15',
    endDate: '1987-11-15',
    description: 'The largest single-day percentage decline in stock market history'
  },
  {
    id: 'dot-com-bubble',
    name: 'Dot-Com Bubble',
    startDate: '2000-03-10',
    endDate: '2002-10-09',
    description: 'The burst of the internet bubble and subsequent market crash'
  },
  {
    id: '2008-crisis',
    name: '2008 Financial Crisis',
    startDate: '2007-10-09',
    endDate: '2009-03-09',
    description: 'The global financial crisis and Great Recession'
  },
  {
    id: 'covid-crash',
    name: 'COVID-19 Market Crash',
    startDate: '2020-02-19',
    endDate: '2020-05-01',
    description: 'The rapid market decline due to COVID-19 pandemic'
  },
  {
    id: 'modern-bull',
    name: 'Modern Bull Run',
    startDate: '2016-01-01',
    endDate: '2024-01-01',
    description: 'The extended bull market of the 2010s and 2020s'
  },
  {
    id: '1970s-recession',
    name: '1970s Oil Crisis',
    startDate: '1973-10-01',
    endDate: '1975-03-01',
    description: 'Economic recession caused by oil embargo and energy crisis'
  },
  {
    id: 'savings-loan-crisis',
    name: 'Savings & Loan Crisis',
    startDate: '1989-01-01',
    endDate: '1991-03-01',
    description: 'Financial crisis affecting hundreds of savings and loan associations'
  }
];