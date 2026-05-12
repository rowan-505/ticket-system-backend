import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from "typeorm";

import { Concert } from "./concert.entity";

@Entity({ name: "tickets" })
export class Ticket {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Concert, { onDelete: "CASCADE" })
  @JoinColumn({ name: "concertId" })
  concert!: Concert;

  @Column({ type: "text", nullable: true })
  category!: string | null;

  @Column({ type: "text", name: "internal_note", nullable: true })
  internalNote!: string | null;

  @VersionColumn()
  version!: number;

  @CreateDateColumn({ type: "datetime" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime" })
  updatedAt!: Date;
}
