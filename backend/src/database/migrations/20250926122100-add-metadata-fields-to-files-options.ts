import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      const table = await queryInterface.describeTable("FilesOptions");
      
      // Adicionar campos de metadados para arquivos individuais
      if (!table["isActive"]) {
        await queryInterface.addColumn(
          "FilesOptions",
          "isActive",
          {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
          },
          { transaction }
        );
      }

      if (!table["keywords"]) {
        await queryInterface.addColumn(
          "FilesOptions",
          "keywords",
          {
            type: DataTypes.TEXT,
            allowNull: true,
            defaultValue: null
          },
          { transaction }
        );
      }

      if (!table["description"]) {
        await queryInterface.addColumn(
          "FilesOptions",
          "description",
          {
            type: DataTypes.TEXT,
            allowNull: true,
            defaultValue: null
          },
          { transaction }
        );
      }
    });
  },

  down: async (queryInterface) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      const table = await queryInterface.describeTable("FilesOptions");
      
      if (table["description"]) {
        await queryInterface.removeColumn("FilesOptions", "description", { transaction });
      }
      
      if (table["keywords"]) {
        await queryInterface.removeColumn("FilesOptions", "keywords", { transaction });
      }
      
      if (table["isActive"]) {
        await queryInterface.removeColumn("FilesOptions", "isActive", { transaction });
      }
    });
  }
};
