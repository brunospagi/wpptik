import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      const table = await queryInterface.describeTable("CompaniesSettings");
      
      // Adicionar campo openaiApiKey se não existir
      if (!table["openaiApiKey"]) {
        await queryInterface.addColumn(
          "CompaniesSettings",
          "openaiApiKey",
          {
            type: DataTypes.TEXT,
            allowNull: true,
            defaultValue: null,
          },
          { transaction }
        );
      }

      // Adicionar campo openaiModel se não existir
      if (!table["openaiModel"]) {
        await queryInterface.addColumn(
          "CompaniesSettings",
          "openaiModel",
          {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: "gpt-3.5-turbo",
          },
          { transaction }
        );
      }
    });
  },

  down: async (queryInterface: QueryInterface) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      const table = await queryInterface.describeTable("CompaniesSettings");
      
      if (table["openaiApiKey"]) {
        await queryInterface.removeColumn("CompaniesSettings", "openaiApiKey", { transaction });
      }

      if (table["openaiModel"]) {
        await queryInterface.removeColumn("CompaniesSettings", "openaiModel", { transaction });
      }
    });
  },
};
