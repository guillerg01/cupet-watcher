import { AppUser } from "./app-user.entity";
import { XutilLink } from "./xutil-link.entity";
import { ScraperCredential } from "./scraper-credential.entity";
import { Province } from "./province.entity";
import { UserProvince } from "./user-province.entity";
import { Station } from "./station.entity";
import { StationSnapshot } from "./station-snapshot.entity";
import { DetectionEvent } from "./detection-event.entity";
import { Notification } from "./notification.entity";
import { PredictionCache } from "./prediction-cache.entity";
import { Device } from "./device.entity";
import { Assignment } from "./assignment.entity";
import { AuthAttempt } from "./auth-attempt.entity";

export const entities = [
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
] ;

export type { AppUser } from "./app-user.entity";
export type { XutilLink } from "./xutil-link.entity";
export type { ScraperCredential } from "./scraper-credential.entity";
export type { Province } from "./province.entity";
export type { UserProvince } from "./user-province.entity";
export type { Station } from "./station.entity";
export type { StationSnapshot } from "./station-snapshot.entity";
export type { DetectionEvent } from "./detection-event.entity";
export type { Notification } from "./notification.entity";
export type { PredictionCache } from "./prediction-cache.entity";
export type { Device } from "./device.entity";
export type { Assignment } from "./assignment.entity";
export type { AuthAttempt } from "./auth-attempt.entity";

export * from "./enums";
