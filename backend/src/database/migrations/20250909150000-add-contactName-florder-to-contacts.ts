import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // contactName: string nullable
    await queryInterface.addColumn("Contacts", "contactName", {
      type: DataTypes.STRING,
      allowNull: true
    });

    // florder: boolean default false
    await queryInterface.addColumn("Contacts", "florder", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Contacts", "contactName");
    await queryInterface.removeColumn("Contacts", "florder");
  }
};
