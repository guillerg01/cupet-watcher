import {
  Entity,
  PrimaryColumn,
  Column,
  Index,
  CreateDateColumn,
  BeforeInsert,
} from "typeorm";
import { AssignmentStatus, AssignmentKind } from "./enums";
import { newId } from "../id";

/**
 * A unit of work assigned by the coordinator to one device: fetch fresh detail
 * for a batch of stations. The device claims it via GET /api/devices/poll and
 * reports back via POST /api/ingest/snapshot. Stale claims are reassigned
 * (failover) by the coordinator job.
 */
@Entity("Assignment")
@Index(["status"])
@Index(["deviceId", "status"])
export class Assignment {
  @PrimaryColumn({ type: "varchar" })
  id!: string;

  // Target device. Null only transiently while being reassigned.
  @Column({ type: "varchar", nullable: true })
  deviceId!: string | null;

  @Column({ type: "enum", enum: AssignmentKind, default: AssignmentKind.CATALOG })
  kind!: AssignmentKind;

  // Only used for DETAIL assignments; empty for CATALOG sweeps.
  @Column({ type: "jsonb", default: () => "'[]'" })
  stationIds!: number[];

  @Column({ type: "enum", enum: AssignmentStatus, default: AssignmentStatus.PENDING })
  status!: AssignmentStatus;

  @Column({ type: "timestamptz" })
  expiresAt!: Date;

  @Column({ type: "timestamptz", nullable: true })
  claimedAt!: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  completedAt!: Date | null;

  @Column({ type: "int", default: 0 })
  attempts!: number;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @BeforeInsert()
  assignId(): void {
    if (!this.id) this.id = newId();
  }
}
