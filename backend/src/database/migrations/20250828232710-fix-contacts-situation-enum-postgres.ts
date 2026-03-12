import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const dialect = queryInterface.sequelize.getDialect();
    if (dialect === "postgres") {
      // No Postgres, evita transação ao adicionar valores ao ENUM
      await queryInterface.sequelize.query(
        `DO $$
        BEGIN
          IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_Contacts_situation_old') THEN
            ALTER TYPE "enum_Contacts_situation_old" ADD VALUE IF NOT EXISTS 'Ativo';
            ALTER TYPE "enum_Contacts_situation_old" ADD VALUE IF NOT EXISTS 'Baixado';
            ALTER TYPE "enum_Contacts_situation_old" ADD VALUE IF NOT EXISTS 'Ex-Cliente';
            ALTER TYPE "enum_Contacts_situation_old" ADD VALUE IF NOT EXISTS 'Excluido';
            ALTER TYPE "enum_Contacts_situation_old" ADD VALUE IF NOT EXISTS 'Futuro';
            ALTER TYPE "enum_Contacts_situation_old" ADD VALUE IF NOT EXISTS 'Inativo';
          END IF;

          IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_Contacts_situation') THEN
            ALTER TYPE "enum_Contacts_situation" ADD VALUE IF NOT EXISTS 'Ativo';
            ALTER TYPE "enum_Contacts_situation" ADD VALUE IF NOT EXISTS 'Baixado';
            ALTER TYPE "enum_Contacts_situation" ADD VALUE IF NOT EXISTS 'Ex-Cliente';
            ALTER TYPE "enum_Contacts_situation" ADD VALUE IF NOT EXISTS 'Excluido';
            ALTER TYPE "enum_Contacts_situation" ADD VALUE IF NOT EXISTS 'Futuro';
            ALTER TYPE "enum_Contacts_situation" ADD VALUE IF NOT EXISTS 'Inativo';
          END IF;
        END
        $$;`
      );
    } else if (dialect === "mysql" || dialect === "mariadb") {
      // Para MySQL/MariaDB mantém dentro de transação
      return queryInterface.sequelize.transaction(async (transaction) => {
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
      });
    }
  },

  down: async (queryInterface: QueryInterface) => {
    const dialect = queryInterface.sequelize.getDialect();
    return queryInterface.sequelize.transaction(async (transaction) => {
      if (dialect === "postgres") {
        // Sem operação de down para não remover valores possivelmente já em uso.
        return;
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
      }
    });
  },
};
