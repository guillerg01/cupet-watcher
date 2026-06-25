import "@/load-env";
import "reflect-metadata";
import { DataSource, DefaultNamingStrategy, type NamingStrategyInterface } from "typeorm";
import { entities } from "./entities";

class PrismaNamingStrategy
  extends DefaultNamingStrategy
  implements NamingStrategyInterface
{
  tableName(className: string, customName?: string): string {
    return customName ?? className;
  }

  columnName(
    propertyName: string,
    customName: string | undefined,
    _embeddedPrefixes: string[],
  ): string {
    return customName ?? propertyName;
  }
}

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env and start Postgres.");
  }
  return url;
}

export function createDataSource(synchronize = false): DataSource {
  return new DataSource({
    type: "postgres",
    url: getDatabaseUrl(),
    entities,
    synchronize,
    namingStrategy: new PrismaNamingStrategy(),
    ssl:
      process.env.DATABASE_URL?.includes("sslmode=require") ||
      process.env.DATABASE_URL?.includes("render.com") ||
      process.env.DATABASE_URL?.includes("neon.tech")
        ? { rejectUnauthorized: false }
        : process.env.NODE_ENV === "production"
          ? { rejectUnauthorized: false }
          : undefined,
  });
}

let appDataSource: DataSource | undefined;

export function getAppDataSource(): DataSource {
  if (!appDataSource) {
    appDataSource = createDataSource(false);
  }
  return appDataSource;
}
