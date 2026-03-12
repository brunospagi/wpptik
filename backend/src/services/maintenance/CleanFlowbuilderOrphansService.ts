import fs from "fs";
import path from "path";
import { FlowImgModel } from "../../models/FlowImg";
import { FlowAudioModel } from "../../models/FlowAudio";
import uploadConfig from "../../config/upload";

export interface CleanupResult {
  scannedDiskFiles: number;
  scannedDbImages: number;
  scannedDbAudios: number;
  removedFilesOnDisk: string[];
  removedDbImages: number;
  removedDbAudios: number;
}

export default async function CleanFlowbuilderOrphansService(): Promise<CleanupResult> {
  const basePublicDir = uploadConfig.directory; // public/
  const flowbuilderDir = path.join(basePublicDir, "flowbuilder");

  const result: CleanupResult = {
    scannedDiskFiles: 0,
    scannedDbImages: 0,
    scannedDbAudios: 0,
    removedFilesOnDisk: [],
    removedDbImages: 0,
    removedDbAudios: 0,
  };

  // 1) Obter registros do banco
  const [dbImgs, dbAudios] = await Promise.all([
    FlowImgModel.findAll({ attributes: ["id", "name"] }),
    FlowAudioModel.findAll({ attributes: ["id", "name"] }),
  ]);

  result.scannedDbImages = dbImgs.length;
  result.scannedDbAudios = dbAudios.length;

  const dbNamesSet = new Set<string>([
    ...dbImgs.map(i => i.name),
    ...dbAudios.map(a => a.name),
  ]);

  // 2) Listar arquivos no disco (pasta flowbuilder)
  let diskFiles: string[] = [];
  try {
    if (fs.existsSync(flowbuilderDir)) {
      diskFiles = fs.readdirSync(flowbuilderDir).filter(f => fs.statSync(path.join(flowbuilderDir, f)).isFile());
    }
  } catch {
    // se não existir, não há o que limpar
  }

  result.scannedDiskFiles = diskFiles.length;

  // 3) Remover arquivos no disco que não estão no banco
  for (const file of diskFiles) {
    if (!dbNamesSet.has(file)) {
      try {
        fs.unlinkSync(path.join(flowbuilderDir, file));
        result.removedFilesOnDisk.push(file);
      } catch {
        // segue adiante
      }
    }
  }

  // 4) Remover registros do banco cujos arquivos não existem mais no disco
  const fileExists = (name: string) => fs.existsSync(path.join(flowbuilderDir, name));

  for (const img of dbImgs) {
    if (!fileExists(img.name)) {
      try {
        await img.destroy();
        result.removedDbImages += 1;
      } catch {}
    }
  }

  for (const aud of dbAudios) {
    if (!fileExists(aud.name)) {
      try {
        await aud.destroy();
        result.removedDbAudios += 1;
      } catch {}
    }
  }

  return result;
}
