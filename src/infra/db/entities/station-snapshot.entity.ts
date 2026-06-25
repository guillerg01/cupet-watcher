import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import type { Station } from "./station.entity";

@Entity("StationSnapshot")
@Index(["stationId", "ts"])
@Index(["ts"])
export class StationSnapshot {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: string;

  @Column({ type: "int" })
  stationId!: number;

  @ManyToOne("Station", "snapshots", { onDelete: "CASCADE" })
  @JoinColumn({ name: "stationId" })
  station!: Station;

  @Column({ type: "timestamptz", default: () => "now()" })
  ts!: Date;

  @Column({ type: "boolean", default: false })
  disponible!: boolean;

  @Column({ type: "int", default: 0 })
  disponibilidades!: number;

  @Column({ type: "int", nullable: true })
  views!: number | null;

  @Column({ type: "float", nullable: true })
  rating!: number | null;

  @Column({ type: "int", nullable: true })
  queuePosicion!: number | null;

  @Column({ type: "int", nullable: true })
  queueTotal!: number | null;
}
