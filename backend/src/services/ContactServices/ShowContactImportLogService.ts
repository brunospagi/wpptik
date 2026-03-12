import ContactImportLog from "../../models/ContactImportLog";
import User from "../../models/User";
import AppError from "../../errors/AppError";

interface Request {
  id: string | number;
  companyId: number;
}

const ShowContactImportLogService = async ({
  id,
  companyId
}: Request): Promise<ContactImportLog> => {
  const log = await ContactImportLog.findOne({
    where: {
      id,
      companyId
    },
    include: [
      {
        model: User,
        as: "user",
        attributes: ["id", "name", "email"]
      }
    ]
  });

  if (!log) {
    throw new AppError("ERR_NO_IMPORT_LOG_FOUND", 404);
  }

  return log;
};

export default ShowContactImportLogService;
