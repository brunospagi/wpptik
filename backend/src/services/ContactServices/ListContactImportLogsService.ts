import { Op } from "sequelize";
import ContactImportLog from "../../models/ContactImportLog";
import User from "../../models/User";

interface Request {
  companyId: number;
  userId?: number;
  status?: string;
  source?: string;
  searchParam?: string;
  pageNumber?: string | number;
}

interface Response {
  logs: ContactImportLog[];
  count: number;
  hasMore: boolean;
}

const ListContactImportLogsService = async ({
  companyId,
  userId,
  status,
  source,
  searchParam,
  pageNumber = "1"
}: Request): Promise<Response> => {
  const limit = 20;
  const offset = limit * (+pageNumber - 1);

  const whereCondition: any = {
    companyId
  };

  if (userId) {
    whereCondition.userId = userId;
  }

  if (status) {
    whereCondition.status = status;
  }

  if (source) {
    whereCondition.source = source;
  }

  if (searchParam) {
    whereCondition[Op.or] = [
      { jobId: { [Op.like]: `%${searchParam}%` } },
      { fileName: { [Op.like]: `%${searchParam}%` } }
    ];
  }

  const { count, rows: logs } = await ContactImportLog.findAndCountAll({
    where: whereCondition,
    include: [
      {
        model: User,
        as: "user",
        attributes: ["id", "name", "email"]
      }
    ],
    limit,
    offset,
    order: [["createdAt", "DESC"]],
    distinct: true
  });

  const hasMore = count > offset + logs.length;

  return {
    logs,
    count,
    hasMore
  };
};

export default ListContactImportLogsService;
