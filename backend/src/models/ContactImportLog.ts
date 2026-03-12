import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  ForeignKey,
  BelongsTo,
  DataType,
  Default
} from "sequelize-typescript";
import Company from "./Company";
import User from "./User";

@Table
class ContactImportLog extends Model<ContactImportLog> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @ForeignKey(() => User)
  @Column
  userId: number;

  @BelongsTo(() => User)
  user: User;

  @Column
  jobId: string;

  @Column
  source: string; // 'file', 'tags', 'api'

  @Column
  fileName: string;

  @Default("pending")
  @Column
  status: string; // 'pending', 'processing', 'completed', 'failed', 'cancelled'

  @Default(0)
  @Column
  totalRecords: number;

  @Default(0)
  @Column
  processedRecords: number;

  @Default(0)
  @Column
  createdRecords: number;

  @Default(0)
  @Column
  updatedRecords: number;

  @Default(0)
  @Column
  failedRecords: number;

  @Default(0)
  @Column
  skippedRecords: number;

  @Column(DataType.TEXT)
  errors: string; // JSON array de erros detalhados

  @Column(DataType.TEXT)
  options: string; // JSON com opções usadas (tagMapping, etc)

  @Column
  startedAt: Date;

  @Column
  completedAt: Date;

  @Column
  executionTime: number; // em segundos

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default ContactImportLog;
