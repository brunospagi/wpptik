import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("Contacts", "isWhatsappValid", {
      type: DataTypes.BOOLEAN,
      allowNull: true
    });

    await queryInterface.addColumn("Contacts", "validatedAt", {
      type: DataTypes.DATE,
      allowNull: true
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Contacts", "validatedAt");
    await queryInterface.removeColumn("Contacts", "isWhatsappValid");
  }
};
