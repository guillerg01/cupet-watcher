import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  BeforeInsert,
} from "typeorm";
import type { Station } from "./station.entity";
import type { Province } from "./province.entity";
import type { Notification } from "./notification.entity";
import { DetectionType } from "./enums";
import { newId } from "../id";

@Entity("DetectionEvent")
@Index(["notified"])
@Index(["provinceId", "detectedAt"])
export class DetectionEvent {
  @PrimaryColumn({ type: "varchar" })
  id!: string;

  @Column({ type: "int" })
  stationId!: number;

  @ManyToOne("Station", "events", { onDelete: "CASCADE" })
  @JoinColumn({ name: "stationId" })
  station!: Station;

  @Column({ type: "int" })
  provinceId!: number;

  @ManyToOne("Province", "events")
  @JoinColumn({ name: "provinceId" })
  province!: Province;

  @Column({ type: "enum", enum: DetectionType })
  type!: DetectionType;

  @Column({ type: "timestamptz", default: () => "now()" })
  detectedAt!: Date;

  @Column({ type: "boolean", default: false })
  notified!: boolean;

  @OneToMany("Notification", "event")
  notifications!: Notification[];

  @BeforeInsert()
  assignId(): void {
    if (!this.id) this.id = newId();
  }
}
