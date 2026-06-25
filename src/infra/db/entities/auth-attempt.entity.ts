import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  Index,
  BeforeInsert,
} from "typeorm";
import { newId } from "../id";

@Entity("AuthAttempt")
@Index(["email"])
@Index(["createdAt"])
@Index(["success"])
export class AuthAttempt {
  @PrimaryColumn({ type: "varchar" })
  id!: string;

  @Column({ type: "varchar" })
  email!: string;

  @Column({ type: "boolean" })
  success!: boolean;

  @Column({ type: "varchar", nullable: true })
  reason!: string | null;

  @Column({ type: "varchar", nullable: true })
  ip!: string | null;

  @Column({ type: "varchar", nullable: true })
  userAgent!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @BeforeInsert()
  assignId(): void {
    if (!this.id) this.id = newId();
  }
}
