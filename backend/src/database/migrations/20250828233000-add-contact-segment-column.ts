import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        "Contacts",
        "segment",
        {
          type: DataTypes.STRING,
          allowNull: true
        },
        { transaction }
      );
    });
  },

  down: async (queryInterface: QueryInterface) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      try {
        const table = await queryInterface.describeTable("Contacts");
        if (table && (table as any)["segment"]) {
          await queryInterface.removeColumn("Contacts", "segment", { transaction } as any);
        }
      } catch (err) {
        // Fallback: tenta remover a coluna diretamente
        try {
          await queryInterface.removeColumn("Contacts", "segment", { transaction } as any);
        } catch (e) {
          // ignora
        }
      }
    });
  }
};
