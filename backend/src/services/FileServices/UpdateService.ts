import * as Yup from "yup";

import AppError from "../../errors/AppError";
import Files from "../../models/Files";
import FilesOptions from "../../models/FilesOptions";
import ShowService from "./ShowService";

interface FileOption {
  id?: number;
  name?: string;
  path?: string;
  mediaType?: string;
  [key: string]: any; // Permite campos adicionais
}

interface FileData {
  id?: number;
  name: string;
  message: string;
  options?: FileOption[];
}

interface Request {
  fileData: FileData;
  id: string | number;
  companyId: number;
}

const UpdateService = async ({
  fileData,
  id,
  companyId
}: Request): Promise<Files | undefined> => {
  const file = await ShowService(id, companyId);

  const schema = Yup.object().shape({
    name: Yup.string().min(3)
  });

  const { name, message, options } = fileData;

  try {
    await schema.validate({ name });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    throw new AppError(err.message);
  }

  if (options) {
    // Monta um array final mesclando dados existentes quando path/mediaType não forem enviados
    const mergedOptions: FileOption[] = [];

    for (const info of options) {
      // Se possuir ID, tenta preservar path/mediaType
      if (info.id) {
        const existing = await FilesOptions.findOne({ where: { id: info.id, fileId: file.id } });
        if (existing) {
          mergedOptions.push({
            id: existing.id,
            name: info.name ?? existing.name,
            path: info.path ?? (existing as any).path,
            mediaType: info.mediaType ?? (existing as any).mediaType
          });
          continue;
        }
      }

      // Para novos itens: somente considere se possuir path/mediaType válidos
      if (info.path && info.mediaType) {
        const hasSubdirs = info.path.includes("/");
        const relPath = hasSubdirs
          ? info.path
          : `company${companyId}/files/${file.id}/${info.path}`;
        mergedOptions.push({
          name: info.name ?? "",
          path: relPath,
          mediaType: info.mediaType
        });
      }
    }

    if (mergedOptions.length > 0) {
      await Promise.all(
        mergedOptions.map(async m => {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          await FilesOptions.upsert({ ...m, fileId: file.id });
        })
      );
    }

    // Exclui options que foram removidas
    await Promise.all(
      file.options.map(async oldInfo => {
        const stillExists = (options || []).findIndex(info => info.id === oldInfo.id);
        if (stillExists === -1) {
          await FilesOptions.destroy({ where: { id: oldInfo.id } });
        }
      })
    );
  }


  
  
  await file.update({
    name,
    message: message ?? ""
  });

  await file.reload({
    attributes: ["id", "name", "message","companyId"],
    include: ["options"]
  });
  return file;
};

export default UpdateService;
