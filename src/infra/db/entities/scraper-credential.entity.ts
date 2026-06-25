import { Entity, PrimaryColumn, Column, UpdateDateColumn } from "typeorm";

@Entity("ScraperCredential")
export class ScraperCredential {
  @PrimaryColumn({ type: "int" })
  id!: number;

  @Column({ type: "varchar" })
  username!: string;

  @Column({ type: "varchar" })
  encryptedToken!: string;

  @Column({ type: "timestamptz" })
  tokenExp!: Date;

  @Column({ type: "varchar", nullable: true })
  refreshToken!: string | null;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}
