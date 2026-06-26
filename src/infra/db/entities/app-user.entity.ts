import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  OneToOne,
  BeforeInsert,
} from "typeorm";
import type { UserProvince } from "./user-province.entity";
import type { XutilLink } from "./xutil-link.entity";
import type { Notification } from "./notification.entity";
import { UserRole } from "./enums";
import { newId } from "../id";

@Entity("AppUser")
export class AppUser {
  @PrimaryColumn({ type: "varchar" })
  id!: string;

  @Column({ type: "varchar", unique: true })
  email!: string;

  @Column({ type: "varchar" })
  passwordHash!: string;

  @Column({ type: "varchar", nullable: true })
  name!: string | null;

  @Column({ type: "enum", enum: UserRole, default: UserRole.USER })
  role!: UserRole;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @Column({ type: "boolean", default: false })
  notifyNew!: boolean;

  @Column({ type: "boolean", default: false })
  notifyAvailable!: boolean;

  @Column({ type: "boolean", default: false })
  notifyWaitroom!: boolean;

  // Last time the user opened the app and dismissed the new-cupets modal.
  // Pending alerts = NEW/REAPPEARED detections after this timestamp; the cron
  // keeps re-sending the push reminder until this advances.
  @Column({ type: "timestamptz", nullable: true })
  lastAlertsSeenAt!: Date | null;

  // Throttle for the recurring push reminder (don't re-push every cron pass).
  @Column({ type: "timestamptz", nullable: true })
  lastAlertsReminderAt!: Date | null;

  @OneToMany("UserProvince", "user")
  provinces!: UserProvince[];

  @OneToOne("XutilLink", "user")
  xutilLink!: XutilLink | null;

  @OneToMany("Notification", "user")
  notifications!: Notification[];

  @BeforeInsert()
  assignId(): void {
    if (!this.id) this.id = newId();
  }
}
