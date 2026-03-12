import { QueryInterface, Sequelize } from "sequelize";
import database from "../src/config/database";

const sequelize = new Sequelize(database);

async function fixContactListItemsDuplicates() {
  console.log("[FIX DUPLICATES] Iniciando correção de duplicados em ContactListItems...");
  
  try {
    // 1. Verificar duplicados antes da correção
    console.log("[FIX DUPLICATES] Verificando duplicados existentes...");
    const duplicatesQuery = `
      SELECT "contactListId",
             "number",
             COUNT(*) AS duplicates,
             ARRAY_AGG(id ORDER BY "updatedAt" DESC) AS ids
      FROM "ContactListItems"
      GROUP BY "contactListId", "number"
      HAVING COUNT(*) > 1
      ORDER BY duplicates DESC;
    `;
    
    const duplicates = await sequelize.query(duplicatesQuery, {
      type: Sequelize.QueryTypes.SELECT
    });
    
    if (duplicates.length === 0) {
      console.log("[FIX DUPLICATES] ✅ Nenhum duplicado encontrado!");
      return;
    }
    
    console.log(`[FIX DUPLICATES] 📊 Encontrados ${duplicates.length} grupos de duplicados:`);
    duplicates.forEach((dup: any) => {
      console.log(`  - Lista ${dup.contactListId}, Número ${dup.number}: ${dup.duplicates} registros (IDs: ${dup.ids})`);
    });
    
    // 2. Remover duplicados mantendo o mais recente
    console.log("[FIX DUPLICATES] Removendo duplicados (mantendo o mais recente)...");
    const deleteQuery = `
      WITH ranked AS (
        SELECT
          id,
          ROW_NUMBER() OVER (
            PARTITION BY "contactListId", "number"
            ORDER BY "updatedAt" DESC, id DESC
          ) AS rn
        FROM "ContactListItems"
      )
      DELETE FROM "ContactListItems"
      WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
    `;
    
    const result = await sequelize.query(deleteQuery);
    console.log(`[FIX DUPLICATES] ✅ Removidos ${result[1]} registros duplicados.`);
    
    // 3. Verificar se ainda existem duplicados
    console.log("[FIX DUPLICATES] Verificando se ainda existem duplicados...");
    const remainingDuplicates = await sequelize.query(duplicatesQuery, {
      type: Sequelize.QueryTypes.SELECT
    });
    
    if (remainingDuplicates.length === 0) {
      console.log("[FIX DUPLICATES] ✅ Todos os duplicados foram removidos com sucesso!");
      console.log("[FIX DUPLICATES] 🚀 Agora você pode executar: npm run start:prod:migrate");
    } else {
      console.log(`[FIX DUPLICATES] ⚠️  Ainda existem ${remainingDuplicates.length} grupos de duplicados:`);
      remainingDuplicates.forEach((dup: any) => {
        console.log(`  - Lista ${dup.contactListId}, Número ${dup.number}: ${dup.duplicates} registros`);
      });
    }
    
  } catch (error) {
    console.error("[FIX DUPLICATES] ❌ Erro ao corrigir duplicados:", error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  fixContactListItemsDuplicates()
    .then(() => {
      console.log("[FIX DUPLICATES] 🎉 Processo concluído!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("[FIX DUPLICATES] 💥 Falha no processo:", error);
      process.exit(1);
    });
}

export default fixContactListItemsDuplicates;
