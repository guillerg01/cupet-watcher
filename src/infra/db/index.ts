import "reflect-metadata";
import type { DataSource, EntityTarget, ObjectLiteral, Repository } from "typeorm";
import { getAppDataSource, createDataSource } from "./data-source";
import { AppUser } from "./entities/app-user.entity";
import { XutilLink } from "./entities/xutil-link.entity";
import { ScraperCredential } from "./entities/scraper-credential.entity";
import { Province } from "./entities/province.entity";
import { UserProvince } from "./entities/user-province.entity";
import { Station } from "./entities/station.entity";
import { StationSnapshot } from "./entities/station-snapshot.entity";
import { DetectionEvent } from "./entities/detection-event.entity";
import { Notification } from "./entities/notification.entity";
import { PredictionCache } from "./entities/prediction-cache.entity";
import { Device } from "./entities/device.entity";
import { Assignment } from "./entities/assignment.entity";
import { AuthAttempt } from "./entities/auth-attempt.entity";

export {
  AppUser,
  AuthAttempt,
  XutilLink,
  ScraperCredential,
  Province,
  UserProvince,
  Station,
  StationSnapshot,
  DetectionEvent,
  Notification,
  PredictionCache,
  Device,
  Assignment,
};

export * from "./entities/enums";

declare global {
  // eslint-disable-next-line no-var
  var __dbInit: Promise<DataSource> | undefined;
}

export async function db(): Promise<DataSource> {
  const ds = getAppDataSource();
  if (ds.isInitialized) return ds;

  if (!globalThis.__dbInit) {
    globalThis.__dbInit = ds.initialize();
  }

  return globalThis.__dbInit;
}

export async function repo<T extends ObjectLiteral>(
  entity: EntityTarget<T>,
): Promise<Repository<T>> {
  const ds = await db();
  return ds.getRepository(entity) as Repository<T>;
}

export async function syncSchema(): Promise<void> {
  const ds = createDataSource(true);
  await ds.initialize();
  await ds.synchronize();
  await ds.destroy();
}

export { getAppDataSource, createDataSource } from "./data-source";
