import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.addColumn(
        "CampaignShipping",
        "whatsappId",
        {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: "Whatsapps", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "SET NULL"
        },
        { transaction }
      );

      await queryInterface.addIndex(
        "CampaignShipping",
        {
          name: "idx_campaign_shipping_whatsapp",
          fields: ["whatsappId"],
          transaction
        }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface: QueryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.removeIndex(
        "CampaignShipping",
        "idx_campaign_shipping_whatsapp",
        { transaction }
      );

      await queryInterface.removeColumn(
        "CampaignShipping",
        "whatsappId",
        { transaction }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
