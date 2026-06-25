import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
  BeforeInsert,
  Unique,
} from "typeorm";
import type { AppUser } from "./app-user.entity";
import type { DetectionEvent } from "./detection-event.entity";
import { NotificationChannel, NotificationStatus } from "./enums";
import { newId } from "../id";

@Entity("Notification")
@Unique(["userId", "eventId"])
@Index(["status"])
export class Notification {
  @PrimaryColumn({ type: "varchar" })
  id!: string;

  @Column({ type: "varchar" })
  userId!: string;

  @ManyToOne("AppUser", "notifications", { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: AppUser;

  @Column({ type: "varchar" })
  eventId!: string;

  @ManyToOne("DetectionEvent", "notifications", { onDelete: "CASCADE" })
  @JoinColumn({ name: "eventId" })
  event!: DetectionEvent;

  @Column({ type: "enum", enum: NotificationChannel, default: NotificationChannel.EMAIL })
  channel!: NotificationChannel;

  @Column({ type: "enum", enum: NotificationStatus, default: NotificationStatus.PENDING })
  status!: NotificationStatus;

  @Column({ type: "timestamptz", nullable: true })
  sentAt!: Date | null;

  @Column({ type: "varchar", nullable: true })
  error!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @BeforeInsert()
  assignId(): void {
    if (!this.id) this.id = newId();
  }
}
