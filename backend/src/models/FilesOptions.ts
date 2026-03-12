import {
  Table,
  Column,
  Model,
  ForeignKey,
  PrimaryKey,
  AutoIncrement,
  CreatedAt,
  UpdatedAt,
  BelongsTo,
  DataType
} from "sequelize-typescript";
import Files from "./Files";

@Table({
  tableName: "FilesOptions"
})
class FilesOptions extends Model<FilesOptions> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Files)
  @Column
  fileId: number;

  @Column
  name: string;

  @Column
  path: string;

  @Column
  mediaType: string;

  // Novos campos para metadados por arquivo
  @Column
  isActive: boolean;

  @Column(DataType.TEXT)
  keywords: string;

  @Column(DataType.TEXT)
  description: string;

  @Column(DataType.VIRTUAL)
  get url(): string {
    if (!this.path) {
      return null;
    }
    // Garante caminho relativo a partir de /public
    const baseRel = this.path.startsWith("company")
      ? this.path
      : `company${this.file?.companyId}/files/${this.fileId}/${this.path}`;
    return `${process.env.BACKEND_URL}/public/${baseRel}`;
  }

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @BelongsTo(() => Files)
  file: Files;
}

export default FilesOptions;
