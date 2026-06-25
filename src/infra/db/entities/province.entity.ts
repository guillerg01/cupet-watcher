import { Entity, PrimaryColumn, Column, OneToMany } from "typeorm";
import type { Station } from "./station.entity";
import type { UserProvince } from "./user-province.entity";
import type { DetectionEvent } from "./detection-event.entity";

@Entity("Province")
export class Province {
  @PrimaryColumn({ type: "int" })
  id!: number;

  @Column({ type: "varchar" })
  name!: string;

  @OneToMany("Station", "province")
  stations!: Station[];

  @OneToMany("UserProvince", "province")
  userProvinces!: UserProvince[];

  @OneToMany("DetectionEvent", "province")
  events!: DetectionEvent[];
}
