import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';

config();

const isNeon = process.env.DATABASE_URL?.includes('neon.tech');

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: isNeon ? { rejectUnauthorized: false } : false,
  entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  synchronize: false,
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
