import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

import { Concert } from "./concert.entity";

export enum ReservationStatus {
  PENDING = "PENDING",
  COMPLETED = "COMPLETED",
  EXPIRED = "EXPIRED",
}

@Entity({ name: "reservations" })
export class Reservation {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Concert, { onDelete: "CASCADE" })
  @JoinColumn({ name: "concertId" })
  concert!: Concert;

  @Column({ type: "text" })
  userId!: string;

  @Column({ type: "integer" })
  quantity!: number;

  @Column({
    type: "simple-enum",
    enum: ReservationStatus,
    default: ReservationStatus.PENDING,
  })
  status!: ReservationStatus;

  @Column({ type: "datetime" })
  expiresAt!: Date;

  @CreateDateColumn({ type: "datetime" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "datetime" })
  updatedAt!: Date;
}
