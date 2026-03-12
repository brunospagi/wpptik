import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("AIUsageLogs", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      module: {
        type: DataTypes.STRING,
        allowNull: false
      },
      mode: {
        type: DataTypes.STRING,
        allowNull: false
      },
      provider: {
        type: DataTypes.STRING,
        allowNull: false
      },
      model: {
        type: DataTypes.STRING,
        allowNull: false
      },
      tokensPrompt: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      tokensCompletion: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      costUsd: {
        type: DataTypes.DECIMAL(10, 6),
        allowNull: true
      },
      processingTimeMs: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      ragUsed: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      ragDocumentIds: {
        type: DataTypes.JSONB,
        allowNull: true
      },
      success: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      errorCode: {
        type: DataTypes.STRING,
        allowNull: true
      },
      errorMessage: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false
      }
    });

    await queryInterface.addIndex("AIUsageLogs", ["companyId"], {
      name: "ai_usage_company_idx"
    });

    await queryInterface.addIndex("AIUsageLogs", ["companyId", "createdAt"], {
      name: "ai_usage_company_created_idx"
    });

    await queryInterface.addIndex("AIUsageLogs", ["companyId", "provider"], {
      name: "ai_usage_company_provider_idx"
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeIndex("AIUsageLogs", "ai_usage_company_provider_idx");
    await queryInterface.removeIndex("AIUsageLogs", "ai_usage_company_created_idx");
    await queryInterface.removeIndex("AIUsageLogs", "ai_usage_company_idx");
    await queryInterface.dropTable("AIUsageLogs");
  }
};
