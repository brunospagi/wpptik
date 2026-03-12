import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      const table = await queryInterface.describeTable("Queues");
      
      // Adicionar campos de controle inteligente de arquivos
      if (!table["autoSendStrategy"]) {
        await queryInterface.addColumn(
          "Queues",
          "autoSendStrategy",
          {
            type: DataTypes.ENUM('none', 'on_enter', 'on_request', 'manual'),
            allowNull: false,
            defaultValue: 'none'
          },
          { transaction }
        );
      }

      if (!table["confirmationTemplate"]) {
        await queryInterface.addColumn(
          "Queues",
          "confirmationTemplate",
          {
            type: DataTypes.TEXT,
            allowNull: true,
            defaultValue: null
          },
          { transaction }
        );
      }

      if (!table["maxFilesPerSession"]) {
        await queryInterface.addColumn(
          "Queues",
          "maxFilesPerSession",
          {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 3
          },
          { transaction }
        );
      }

      if (!table["ragCollection"]) {
        await queryInterface.addColumn(
          "Queues",
          "ragCollection",
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
      const table = await queryInterface.describeTable("Queues");
      
      if (table["ragCollection"]) {
        await queryInterface.removeColumn("Queues", "ragCollection", { transaction });
      }
      
      if (table["maxFilesPerSession"]) {
        await queryInterface.removeColumn("Queues", "maxFilesPerSession", { transaction });
      }
      
      if (table["confirmationTemplate"]) {
        await queryInterface.removeColumn("Queues", "confirmationTemplate", { transaction });
      }
      
      if (table["autoSendStrategy"]) {
        await queryInterface.removeColumn("Queues", "autoSendStrategy", { transaction });
      }
    });
  }
};
