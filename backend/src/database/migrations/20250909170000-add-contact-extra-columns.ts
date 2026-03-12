import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      // contactName
      const table = await queryInterface.describeTable("Contacts");
      if (!table["contactName"]) {
        await queryInterface.addColumn(
          "Contacts",
          "contactName",
          {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: null,
          },
          { transaction }
        );
      }

      // florder
      if (!table["florder"]) {
        await queryInterface.addColumn(
          "Contacts",
          "florder",
          {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          { transaction }
        );
      }

      // dtUltCompra
      if (!table["dtUltCompra"]) {
        await queryInterface.addColumn(
          "Contacts",
          "dtUltCompra",
          {
            type: DataTypes.DATEONLY,
            allowNull: true,
            defaultValue: null,
          },
          { transaction }
        );
      }
    });
  },

  down: async (queryInterface: QueryInterface) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      const table = await queryInterface.describeTable("Contacts");
      if (table["dtUltCompra"]) {
        await queryInterface.removeColumn("Contacts", "dtUltCompra", { transaction });
      }
      if (table["florder"]) {
        await queryInterface.removeColumn("Contacts", "florder", { transaction });
      }
      if (table["contactName"]) {
        await queryInterface.removeColumn("Contacts", "contactName", { transaction });
      }
    });
  },
};
