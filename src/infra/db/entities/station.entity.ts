import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from "typeorm";
import type { Province } from "./province.entity";
import type { StationSnapshot } from "./station-snapshot.entity";
import type { DetectionEvent } from "./detection-event.entity";

@Entity("Station")
@Index(["provinceId"])
@Index(["active"])
export class Station {
  @PrimaryColumn({ type: "int" })
  id!: number;

  @Column({ type: "varchar" })
  name!: string;

  @Column({ type: "varchar" })
  establishment!: string;

  @Column({ type: "int" })
  provinceId!: number;

  @ManyToOne("Province", "stations")
  @JoinColumn({ name: "provinceId" })
  province!: Province;

  @Column({ type: "varchar", nullable: true })
  municipio!: string | null;

  @Column({ type: "float", nullable: true })
  lat!: number | null;

  @Column({ type: "float", nullable: true })
  lng!: number | null;

  @Column({ type: "boolean", default: false })
  admiteSalaEspera!: boolean;

  @Column({ type: "boolean", default: false })
  tieneValidacion!: boolean;

  @Column({ type: "int", default: 0 })
  disponibilidades!: number;

  @Column({ type: "boolean", default: true })
  active!: boolean;

  @Column({ type: "timestamptz", default: () => "now()" })
  firstSeenAt!: Date;

  @Column({ type: "timestamptz", default: () => "now()" })
  lastSeenAt!: Date;

  @Column({ type: "jsonb", nullable: true })
  detailCache!: Record<string, unknown> | null;

  @Column({ type: "timestamptz", nullable: true })
  detailFetchedAt!: Date | null;

  @OneToMany("StationSnapshot", "station")
  snapshots!: StationSnapshot[];

  @OneToMany("DetectionEvent", "station")
  events!: DetectionEvent[];
}
