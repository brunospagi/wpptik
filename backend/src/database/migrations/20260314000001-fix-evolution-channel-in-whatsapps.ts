import { QueryInterface } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // Atualiza o canal para 'evolution' apenas nas conexões que possuem
    // dados da Evolution API configurados (evolutionInstanceName preenchido)
    await queryInterface.sequelize.query(`
      UPDATE "Whatsapps"
      SET channel = 'evolution'
      WHERE "evolutionInstanceName" IS NOT NULL
        AND "evolutionInstanceName" != ''
        AND (channel IS NULL OR channel != 'evolution');
    `);
  },

  down: async (queryInterface: QueryInterface) => {
    // Como é apenas uma correção de integridade de dados,
    // não precisamos de uma lógica complexa de rollback.
    console.log("Nenhum rollback necessário para a correção de canais da Evolution.");
  }
};
