import { Sequelize, Op, Filterable } from "sequelize";
import QueueIntegrations from "../../models/QueueIntegrations";

interface Request {
  searchParam?: string;
  pageNumber?: string | number;
  companyId: number;
  // Lista de tipos a incluir (separados por vírgula). Ex.: "dialogflow,n8n"
  type?: string;
  // Lista de tipos a EXCLUIR (separados por vírgula). Ex.: "openai,gemini,knowledge"
  excludeTypes?: string;
}

interface Response {
  queueIntegrations: QueueIntegrations[];
  count: number;
  hasMore: boolean;
}

const ListQueueIntegrationService = async ({
  searchParam = "",
  pageNumber = "1",
  companyId,
  type,
  excludeTypes
}: Request): Promise<Response> => {
  let whereCondition: Filterable["where"] = {
    [Op.or]: [
      {
        "$QueueIntegrations.name$": Sequelize.where(
          Sequelize.fn("LOWER", Sequelize.col("QueueIntegrations.name")),
          "LIKE",
          `%${searchParam.toLowerCase()}%`
        )
      }     
    ]
  };

  whereCondition = {
    ...whereCondition,
    companyId,
    // Excluir presets da lista de integrações
    type: {
      [Op.notLike]: 'preset-%'
    }
  };

  // Filtros dinâmicos por tipo
  const includeTypes = (type || "")
    .split(",")
    .map(t => t.trim())
    .filter(Boolean);

  const excludeTypesList = (excludeTypes || "")
    .split(",")
    .map(t => t.trim())
    .filter(Boolean);

  // Aplica IN se includeTypes for informado
  if (includeTypes.length > 0) {
    (whereCondition as any).type = {
      ...(whereCondition as any).type,
      [Op.in]: includeTypes
    };
  }

  // Aplica NOT IN se excludeTypes for informado
  if (excludeTypesList.length > 0) {
    (whereCondition as any).type = {
      ...(whereCondition as any).type,
      [Op.notIn]: excludeTypesList
    };
  }

  const limit = 20;
  const offset = limit * (+pageNumber - 1);

  const { count, rows: queueIntegrations } = await QueueIntegrations.findAndCountAll({
    where: whereCondition,    
    limit,
    offset,
    order: [["createdAt", "DESC"]],    
  });

  const hasMore = count > offset + queueIntegrations.length;

  return {
    queueIntegrations,
    count,
    hasMore
  };
};

export default ListQueueIntegrationService;