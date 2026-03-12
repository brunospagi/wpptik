import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("ContactImportLogs", {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      companyId: {
        type: DataTypes.INTEGER,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        allowNull: false
      },
      userId: {
        type: DataTypes.INTEGER,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
        allowNull: true
      },
      jobId: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      source: {
        type: DataTypes.STRING,
        allowNull: false
      },
      fileName: {
        type: DataTypes.STRING,
        allowNull: true
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "pending"
      },
      totalRecords: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      processedRecords: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      createdRecords: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      updatedRecords: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      failedRecords: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      skippedRecords: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      errors: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      options: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      startedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      completedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      executionTime: {
        type: DataTypes.INTEGER,
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

    await queryInterface.addIndex("ContactImportLogs", ["companyId", "status"], {
      name: "ContactImportLogs_company_status_idx"
    });

    await queryInterface.addIndex("ContactImportLogs", ["jobId"], {
      name: "ContactImportLogs_jobId_idx"
    });

    await queryInterface.addIndex("ContactImportLogs", ["userId"], {
      name: "ContactImportLogs_userId_idx"
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("ContactImportLogs");
  }
};
