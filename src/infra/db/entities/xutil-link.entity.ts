import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
  BeforeInsert,
} from "typeorm";
import type { AppUser } from "./app-user.entity";
import { newId } from "../id";

@Entity("XutilLink")
export class XutilLink {
  @PrimaryColumn({ type: "varchar" })
  id!: string;

  @Column({ type: "varchar", unique: true })
  userId!: string;

  @OneToOne("AppUser", "xutilLink", { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: AppUser;

  @Column({ type: "varchar" })
  xutilUsername!: string;

  @Column({ type: "varchar" })
  encryptedToken!: string;

  @Column({ type: "varchar", nullable: true })
  encryptedRefreshToken!: string | null;

  @Column({ type: "timestamptz" })
  tokenExp!: Date;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @BeforeInsert()
  assignId(): void {
    if (!this.id) this.id = newId();
  }
}
