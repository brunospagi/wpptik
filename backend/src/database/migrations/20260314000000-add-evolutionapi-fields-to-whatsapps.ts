import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("Whatsapps", "evolutionApiUrl", {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null
    });
    await queryInterface.addColumn("Whatsapps", "evolutionApiKey", {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null
    });
    await queryInterface.addColumn("Whatsapps", "evolutionInstanceName", {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Whatsapps", "evolutionApiUrl");
    await queryInterface.removeColumn("Whatsapps", "evolutionApiKey");
    await queryInterface.removeColumn("Whatsapps", "evolutionInstanceName");
  }
};
