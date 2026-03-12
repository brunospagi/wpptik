-- Script manual para corrigir duplicados e aplicar índice
-- Execute este script diretamente no PostgreSQL se o script JS não funcionar

-- 1. Verificar duplicados
SELECT 
    "contactListId",
    "number",
    COUNT(*) AS duplicates,
    ARRAY_AGG(id ORDER BY "updatedAt" DESC) AS ids
FROM "ContactListItems"
GROUP BY "contactListId", "number"
HAVING COUNT(*) > 1
ORDER BY duplicates DESC;

-- 2. Remover duplicados (mantendo o mais recente)
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

-- 3. Verificar se limpeza funcionou
SELECT 
    "contactListId",
    "number",
    COUNT(*) AS duplicates
FROM "ContactListItems"
GROUP BY "contactListId", "number"
HAVING COUNT(*) > 1;

-- 4. Criar o índice único manualmente
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS contactlistitems_listid_number_unique 
ON "ContactListItems" ("contactListId", "number");

-- 5. Marcar migration como executada (se necessário)
-- INSERT INTO "SequelizeMeta" (name) VALUES ('20251023011200-add-unique-index-contactlistitems-number.ts')
-- ON CONFLICT (name) DO NOTHING;
