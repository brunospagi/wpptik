import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const dialect = queryInterface.sequelize.getDialect();
    return queryInterface.sequelize.transaction(async (transaction) => {
      if (dialect === "postgres") {
        // Adiciona todos os novos valores ao tipo ENUM existente no Postgres
        await queryInterface.sequelize.query(`ALTER TYPE "enum_Contacts_situation" ADD VALUE IF NOT EXISTS 'Ativo';`, { transaction });
        await queryInterface.sequelize.query(`ALTER TYPE "enum_Contacts_situation" ADD VALUE IF NOT EXISTS 'Baixado';`, { transaction });
        await queryInterface.sequelize.query(`ALTER TYPE "enum_Contacts_situation" ADD VALUE IF NOT EXISTS 'Ex-Cliente';`, { transaction });
        await queryInterface.sequelize.query(`ALTER TYPE "enum_Contacts_situation" ADD VALUE IF NOT EXISTS 'Excluido';`, { transaction });
        await queryInterface.sequelize.query(`ALTER TYPE "enum_Contacts_situation" ADD VALUE IF NOT EXISTS 'Futuro';`, { transaction });
        await queryInterface.sequelize.query(`ALTER TYPE "enum_Contacts_situation" ADD VALUE IF NOT EXISTS 'Inativo';`, { transaction });
      } else if (dialect === "mysql" || dialect === "mariadb") {
        // Atualiza o ENUM no MySQL/MariaDB via changeColumn
        await queryInterface.changeColumn(
          "Contacts",
          "situation",
          {
            type: DataTypes.ENUM("Ativo", "Baixado", "Ex-Cliente", "Excluido", "Futuro", "Inativo"),
            allowNull: true,
            defaultValue: "Ativo",
          },
          { transaction }
        );
      } else {
        // Fallback: tenta changeColumn para outros dialetos suportados
        await queryInterface.changeColumn(
          "Contacts",
          "situation",
          {
            type: DataTypes.ENUM("Ativo", "Baixado", "Ex-Cliente", "Excluido", "Futuro", "Inativo"),
            allowNull: true,
            defaultValue: "Ativo",
          },
          { transaction }
        );
      }
    });
  },

  down: async (queryInterface: QueryInterface) => {
    const dialect = queryInterface.sequelize.getDialect();
    return queryInterface.sequelize.transaction(async (transaction) => {
      if (dialect === "postgres") {
        // Reverter ENUM no Postgres requer recriar o tipo sem o valor
        await queryInterface.sequelize.query(
          `UPDATE "Contacts" SET "situation" = 'Ativo' WHERE "situation" = 'Excluido';`,
          { transaction }
        );
        await queryInterface.sequelize.query(
          `ALTER TABLE "Contacts" ALTER COLUMN "situation" TYPE VARCHAR(255);`,
          { transaction }
        );
        await queryInterface.sequelize.query(
          `DROP TYPE IF EXISTS "enum_Contacts_situation";`,
          { transaction }
        );
        await queryInterface.sequelize.query(
          `CREATE TYPE "enum_Contacts_situation" AS ENUM ('Ativo','Baixado','Ex-Cliente','Excluido','Futuro','Inativo');`,
          { transaction }
        );
        await queryInterface.sequelize.query(
          `ALTER TABLE "Contacts" ALTER COLUMN "situation" TYPE "enum_Contacts_situation" USING "situation"::"enum_Contacts_situation";`,
          { transaction }
        );
        await queryInterface.sequelize.query(
          `ALTER TABLE "Contacts" ALTER COLUMN "situation" SET DEFAULT 'Ativo';`,
          { transaction }
        );
      } else if (dialect === "mysql" || dialect === "mariadb") {
        await queryInterface.changeColumn(
          "Contacts",
          "situation",
          {
            type: DataTypes.ENUM("Ativo", "Baixado", "Ex-Cliente", "Excluido", "Futuro", "Inativo"),
            allowNull: true,
            defaultValue: "Ativo",
          },
          { transaction }
        );
      } else {
        await queryInterface.changeColumn(
          "Contacts",
          "situation",
          {
            type: DataTypes.ENUM("Ativo", "Baixado", "Ex-Cliente", "Excluido", "Futuro", "Inativo"),
            allowNull: true,
            defaultValue: "Ativo",
          },
          { transaction }
        );
      }
    });
  },
};
