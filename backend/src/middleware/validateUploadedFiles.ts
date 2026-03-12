import fs from "fs";
import type { Request, Response, NextFunction } from "express";
import { DEFAULT_ALLOWED_MIMES } from "../config/uploadFactory";

// Multer types variam, então definimos interface parcial compatível
type MaybeMulterFile = {
  path?: string;
  buffer?: Buffer;
  mimetype?: string;
  originalname?: string;
};

interface Options {
  allowedMimes?: string[];
}

async function detectMimeFromFilePath(filePath: string): Promise<string | undefined> {
  try {
    const mod = await import("file-type");
    const { fileTypeFromFile } = mod as any;
    if (typeof fileTypeFromFile === "function") {
      const res = await fileTypeFromFile(filePath);
      return res?.mime;
    }
  } catch {
    // silencioso; fallback para mimetype do multer
  }
  return undefined;
}

async function detectMimeFromBuffer(buf: Buffer): Promise<string | undefined> {
  try {
    const mod = await import("file-type");
    const { fileTypeFromBuffer } = mod as any;
    if (typeof fileTypeFromBuffer === "function") {
      const res = await fileTypeFromBuffer(buf);
      return res?.mime;
    }
  } catch {
    // silencioso
  }
  return undefined;
}

async function validateOne(file: MaybeMulterFile, allowed: string[]) {
  let realMime: string | undefined;

  if (file.path) {
    realMime = await detectMimeFromFilePath(file.path);
  } else if (file.buffer) {
    realMime = await detectMimeFromBuffer(file.buffer);
  }

  const candidate = realMime || file.mimetype || "";
  const ok = allowed.length === 0 || allowed.includes(candidate);

  if (!ok) {
    // remove o arquivo se estiver persistido em disco
    if (file.path) {
      try { fs.unlinkSync(file.path); } catch {}
    }
    const name = file.originalname || "arquivo";
    throw new Error(`Tipo de arquivo inválido: ${candidate} (${name})`);
  }
}

export default function validateUploadedFiles(opts: Options = {}) {
  const allowed = opts.allowedMimes || DEFAULT_ALLOWED_MIMES;
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filesAny = (req as any).files as MaybeMulterFile[] | Record<string, MaybeMulterFile[]> | undefined;
      const fileAny = (req as any).file as MaybeMulterFile | undefined;

      const validators: Promise<void>[] = [];

      if (Array.isArray(filesAny)) {
        for (const f of filesAny) validators.push(validateOne(f, allowed));
      } else if (filesAny && typeof filesAny === "object") {
        for (const key of Object.keys(filesAny)) {
          const arr = (filesAny as Record<string, MaybeMulterFile[]>)[key] || [];
          for (const f of arr) validators.push(validateOne(f, allowed));
        }
      } else if (fileAny) {
        validators.push(validateOne(fileAny, allowed));
      }

      await Promise.all(validators);
      next();
    } catch (err: any) {
      res.status(400).json({ error: err?.message || "Arquivo inválido" });
    }
  };
}
