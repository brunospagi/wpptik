import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  CreatedAt,
  UpdatedAt,
  ForeignKey,
  BelongsTo,
  Index
} from "sequelize-typescript";
import Company from "./Company";

@Table({ tableName: "AIUsageLogs" })
export default class AIUsageLog extends Model<AIUsageLog> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id!: number;

  @ForeignKey(() => Company)
  @Index("ai_usage_company_idx")
  @Column(DataType.INTEGER)
  companyId!: number;

  @BelongsTo(() => Company)
  company!: Company;

  @Column(DataType.STRING)
  module!: string;

  @Column(DataType.STRING)
  mode!: string;

  @Column(DataType.STRING)
  provider!: string;

  @Column({ type: DataType.STRING, field: "model" })
  modelName!: string;

  @Column(DataType.INTEGER)
  tokensPrompt?: number | null;

  @Column(DataType.INTEGER)
  tokensCompletion?: number | null;

  @Column(DataType.DECIMAL(10, 6))
  costUsd?: number | null;

  @Column(DataType.INTEGER)
  processingTimeMs?: number | null;

  @Column(DataType.BOOLEAN)
  ragUsed!: boolean;

  @Column(DataType.JSONB)
  ragDocumentIds?: number[] | null;

  @Column(DataType.BOOLEAN)
  success!: boolean;

  @Column(DataType.STRING)
  errorCode?: string | null;

  @Column(DataType.TEXT)
  errorMessage?: string | null;

  @CreatedAt
  @Column(DataType.DATE(6))
  createdAt!: Date;

  @UpdatedAt
  @Column(DataType.DATE(6))
  updatedAt!: Date;
}
