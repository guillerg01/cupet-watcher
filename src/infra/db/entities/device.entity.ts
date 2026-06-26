import {
  Entity,
  PrimaryColumn,
  Column,
  Index,
  CreateDateColumn,
  BeforeInsert,
} from "typeorm";
import { newId } from "../id";

/**
 * A phone acting as a worker node. Identity = the ticket (xutil) username the user
 * logged in with ON THE DEVICE (Cuban IP). The ticket token itself stays on the
 * phone — only the username is known here, used to label/dedupe devices.
 *
 * Workers are decoupled from web AppUsers: a worker contributes global cupet data;
 * web accounts (email+password) are a separate concern for notifications.
 */
@Entity("Device")
@Index(["xutilUsername"])
@Index(["lastHeartbeatAt"])
export class Device {
  @PrimaryColumn({ type: "varchar" })
  id!: string;

  @Column({ type: "varchar" })
  xutilUsername!: string;

  // FCM token for optional end-user alerts on the device.
  @Column({ type: "varchar", nullable: true })
  pushToken!: string | null;

  @Column({ type: "varchar", default: "android" })
  platform!: string;

  // True once the user has logged into ticket on the device (token held locally).
  @Column({ type: "boolean", default: false })
  ticketLinked!: boolean;

  @Column({ type: "timestamptz", nullable: true })
  lastHeartbeatAt!: Date | null;

  // Rotates coordinator assignments fairly across devices.
  @Column({ type: "timestamptz", nullable: true })
  lastAssignedAt!: Date | null;

  @Column({ type: "jsonb", nullable: true })
  pendingPush!: { title: string; body: string } | null;

  @Column({ type: "jsonb", default: () => "'[]'" })
  pendingPushQueue!: Array<{ id: string; title: string; body: string; createdAt: string }>;

  @Column({ type: "jsonb", default: () => "'[]'" })
  watchProvinceIds!: number[];

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @BeforeInsert()
  assignId(): void {
    if (!this.id) this.id = newId();
  }
}
