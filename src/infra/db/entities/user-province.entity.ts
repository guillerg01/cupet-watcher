import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from "typeorm";
import type { AppUser } from "./app-user.entity";
import type { Province } from "./province.entity";

@Entity("UserProvince")
export class UserProvince {
  @PrimaryColumn({ type: "varchar" })
  userId!: string;

  @PrimaryColumn({ type: "int" })
  provinceId!: number;

  @ManyToOne("AppUser", "provinces", { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: AppUser;

  @ManyToOne("Province", "userProvinces", { onDelete: "CASCADE" })
  @JoinColumn({ name: "provinceId" })
  province!: Province;
}
