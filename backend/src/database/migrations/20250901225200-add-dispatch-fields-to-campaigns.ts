import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("Campaigns", "dispatchStrategy", {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "single",
    });

    await queryInterface.addColumn("Campaigns", "allowedWhatsappIds", {
      type: DataTypes.TEXT, // JSON string com array de IDs
      allowNull: true,
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Campaigns", "allowedWhatsappIds");
    await queryInterface.removeColumn("Campaigns", "dispatchStrategy");
  },
};
