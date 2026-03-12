import { Op } from "sequelize";
import Files from "../../models/Files";

interface Request {
  companyId: number
  searchParam?: string;
}

const ListService = async ({ searchParam, companyId }: Request): Promise<Files[]> => {
  let whereCondition = {};

  if (searchParam) {
    whereCondition = {
      [Op.or]: [{ name: { [Op.like]: `%${searchParam}%` } }]
    };
  }

  const files = await Files.findAll({
    where: {companyId, ...whereCondition},
    order: [["name", "ASC"]],
    attributes: {
      exclude: ["createdAt", "updatedAt"]
    },
  });

  return files;
};

export default ListService;
