export enum UserRole {
  USER = "USER",
  ADMIN = "ADMIN",
}

export enum DetectionType {
  NEW = "NEW",
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
