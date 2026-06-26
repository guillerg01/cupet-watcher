export enum UserRole {
  USER = "USER",
  ADMIN = "ADMIN",
}

export enum DetectionType {
  NEW = "NEW",
  // A previously deactivated (departed) cupet that shows up again — the
  // critical business signal: "uno que quitaron del listado volvió".
  REAPPEARED = "REAPPEARED",
  // Was in the catalog and is no longer listed on ticket.xutil.net.
  DEPARTED = "DEPARTED",
  BECAME_AVAILABLE = "BECAME_AVAILABLE",
  WAITROOM_ENABLED = "WAITROOM_ENABLED",
}

export enum NotificationChannel {
  EMAIL = "EMAIL",
  PUSH = "PUSH",
  WEBPUSH = "WEBPUSH",
}

export enum NotificationStatus {
  PENDING = "PENDING",
  SENT = "SENT",
  FAILED = "FAILED",
}

export enum AssignmentStatus {
  PENDING = "PENDING",
  CLAIMED = "CLAIMED",
  DONE = "DONE",
  EXPIRED = "EXPIRED",
}

export enum AssignmentKind {
  // Sweep the full fuel catalog → detect NEW / BECAME_AVAILABLE / WAITROOM.
  CATALOG = "CATALOG",
  // Fetch detail for a specific batch of stations (availability sampling).
  DETAIL = "DETAIL",
}
