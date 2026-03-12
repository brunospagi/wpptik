import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      const table = await queryInterface.describeTable("Files");
      
      // Adicionar campos de metadados para catálogo inteligente
      if (!table["isActive"]) {
        await queryInterface.addColumn(
          "Files",
          "isActive",
          {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
          },
          { transaction }
        );
      }

      if (!table["validFrom"]) {
        await queryInterface.addColumn(
          "Files",
          "validFrom",
          {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: null
          },
          { transaction }
        );
      }

      if (!table["validUntil"]) {
        await queryInterface.addColumn(
          "Files",
          "validUntil",
          {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: null
          },
          { transaction }
        );
      }

      if (!table["tags"]) {
        await queryInterface.addColumn(
          "Files",
          "tags",
          {
            type: DataTypes.JSONB,
            allowNull: true,
            defaultValue: null
          },
          { transaction }
        );
      }

      if (!table["fileSlug"]) {
        await queryInterface.addColumn(
          "Files",
          "fileSlug",
          {
            type: DataTypes.STRING,
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
      const table = await queryInterface.describeTable("Files");
      
      if (table["fileSlug"]) {
        await queryInterface.removeColumn("Files", "fileSlug", { transaction });
      }
      
      if (table["tags"]) {
        await queryInterface.removeColumn("Files", "tags", { transaction });
      }
      
      if (table["validUntil"]) {
        await queryInterface.removeColumn("Files", "validUntil", { transaction });
      }
      
      if (table["validFrom"]) {
        await queryInterface.removeColumn("Files", "validFrom", { transaction });
      }
      
      if (table["isActive"]) {
        await queryInterface.removeColumn("Files", "isActive", { transaction });
      }
    });
  }
};
