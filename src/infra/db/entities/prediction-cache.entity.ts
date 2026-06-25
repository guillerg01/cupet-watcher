import {
  Entity,
  PrimaryColumn,
  Column,
  Index,
  BeforeInsert,
  Unique,
} from "typeorm";
import { newId } from "../id";

@Entity("PredictionCache")
@Unique(["scope", "dow", "hour"])
@Index(["scope"])
export class PredictionCache {
  @PrimaryColumn({ type: "varchar" })
  id!: string;

  @Column({ type: "varchar" })
  scope!: string;

  @Column({ type: "int" })
  dow!: number;

  @Column({ type: "int" })
  hour!: number;

  @Column({ type: "float" })
  avgFill!: number;

  @Column({ type: "float" })
  avgAvail!: number;

  @Column({ type: "int" })
  samples!: number;

  @Column({ type: "float" })
  score!: number;

  @Column({ type: "timestamptz", default: () => "now()" })
  computedAt!: Date;

  @BeforeInsert()
  assignId(): void {
    if (!this.id) this.id = newId();
  }
}
