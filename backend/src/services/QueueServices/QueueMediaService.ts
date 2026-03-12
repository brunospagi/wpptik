import path from "path";
import fs from "fs";
import SendWhatsAppMessage from "../WbotServices/SendWhatsAppMessage";
import SendWhatsAppMedia from "../WbotServices/SendWhatsAppMedia";
import Ticket from "../../models/Ticket";
import FilesOptions from "../../models/FilesOptions";
import logger from "../../utils/logger";

interface MediaInfo {
  type: "image" | "video" | "audio" | "document" | "sticker";
  mimetype: string;
  extension: string;
  maxSize: number; // em MB
  description: string;
}

class QueueMediaService {
  
  /**
   * Tipos de mídia suportados
   */
  static getSupportedMediaTypes(): Record<string, MediaInfo> {
    return {
      // Imagens
      "jpg": { type: "image", mimetype: "image/jpeg", extension: "jpg", maxSize: 16, description: "Imagem JPEG" },
      "jpeg": { type: "image", mimetype: "image/jpeg", extension: "jpeg", maxSize: 16, description: "Imagem JPEG" },
      "png": { type: "image", mimetype: "image/png", extension: "png", maxSize: 16, description: "Imagem PNG" },
      "gif": { type: "image", mimetype: "image/gif", extension: "gif", maxSize: 16, description: "Imagem GIF" },
      "webp": { type: "image", mimetype: "image/webp", extension: "webp", maxSize: 16, description: "Imagem WebP" },

      // Vídeos
      "mp4": { type: "video", mimetype: "video/mp4", extension: "mp4", maxSize: 64, description: "Vídeo MP4" },
      "avi": { type: "video", mimetype: "video/x-msvideo", extension: "avi", maxSize: 64, description: "Vídeo AVI" },
      "mov": { type: "video", mimetype: "video/quicktime", extension: "mov", maxSize: 64, description: "Vídeo MOV" },
      "wmv": { type: "video", mimetype: "video/x-ms-wmv", extension: "wmv", maxSize: 64, description: "Vídeo WMV" },

      // Áudios
      "mp3": { type: "audio", mimetype: "audio/mpeg", extension: "mp3", maxSize: 16, description: "Áudio MP3" },
      "wav": { type: "audio", mimetype: "audio/wav", extension: "wav", maxSize: 16, description: "Áudio WAV" },
      "ogg": { type: "audio", mimetype: "audio/ogg", extension: "ogg", maxSize: 16, description: "Áudio OGG" },
      "aac": { type: "audio", mimetype: "audio/aac", extension: "aac", maxSize: 16, description: "Áudio AAC" },

      // Documentos
      "pdf": { type: "document", mimetype: "application/pdf", extension: "pdf", maxSize: 100, description: "Documento PDF" },
      "doc": { type: "document", mimetype: "application/msword", extension: "doc", maxSize: 100, description: "Documento Word" },
      "docx": { type: "document", mimetype: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", extension: "docx", maxSize: 100, description: "Documento Word" },
      "xls": { type: "document", mimetype: "application/vnd.ms-excel", extension: "xls", maxSize: 100, description: "Planilha Excel" },
      "xlsx": { type: "document", mimetype: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", extension: "xlsx", maxSize: 100, description: "Planilha Excel" },
      "ppt": { type: "document", mimetype: "application/vnd.ms-powerpoint", extension: "ppt", maxSize: 100, description: "Apresentação PowerPoint" },
      "pptx": { type: "document", mimetype: "application/vnd.openxmlformats-officedocument.presentationml.presentation", extension: "pptx", maxSize: 100, description: "Apresentação PowerPoint" },
      "txt": { type: "document", mimetype: "text/plain", extension: "txt", maxSize: 10, description: "Arquivo de Texto" },

      // Stickers (apenas WebP)
      "webp_sticker": { type: "sticker", mimetype: "image/webp", extension: "webp", maxSize: 1, description: "Sticker WebP" }
    };
  }

  /**
   * Detecta o tipo de arquivo baseado na extensão
   */
  static detectFileType(filePath: string): MediaInfo | null {
    const extension = path.extname(filePath).toLowerCase().replace('.', '');
    const supportedTypes = this.getSupportedMediaTypes();
    
    return supportedTypes[extension] || null;
  }

  /**
   * Valida se o arquivo é suportado
   */
  static validateFile(filePath: string): { valid: boolean; error?: string; mediaInfo?: MediaInfo } {
    // Verificar se arquivo existe
    if (!fs.existsSync(filePath)) {
      return { valid: false, error: "Arquivo não encontrado" };
    }

    // Detectar tipo
    const mediaInfo = this.detectFileType(filePath);
    if (!mediaInfo) {
      return { valid: false, error: "Tipo de arquivo não suportado" };
    }

    // Verificar tamanho
    const stats = fs.statSync(filePath);
    const fileSizeMB = stats.size / (1024 * 1024);
    
    if (fileSizeMB > mediaInfo.maxSize) {
      return { 
        valid: false, 
        error: `Arquivo muito grande. Máximo: ${mediaInfo.maxSize}MB, Atual: ${fileSizeMB.toFixed(2)}MB` 
      };
    }

    return { valid: true, mediaInfo };
  }

  /**
   * Envia arquivo com base no tipo detectado
   */
  static async sendMediaFile(
    ticket: Ticket, 
    file: FilesOptions, 
    customCaption?: string
  ): Promise<void> {
    try {
      const publicFolder = path.resolve(__dirname, "..", "..", "..", "public");
      const fullPath = path.resolve(publicFolder, file.path);

      // Validar arquivo
      const validation = this.validateFile(fullPath);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      const mediaInfo = validation.mediaInfo!;
      const caption = customCaption || file.description || file.name;

      // Preparar objeto de mídia
      const mediaSrc = {
        path: fullPath,
        mimetype: mediaInfo.mimetype,
        filename: file.name
      } as Express.Multer.File;

      // Enviar baseado no tipo
      switch (mediaInfo.type) {
        case "image":
          await SendWhatsAppMedia({
            media: mediaSrc,
            ticket,
            body: caption
          });
          break;

        case "video":
          await SendWhatsAppMedia({
            media: mediaSrc,
            ticket,
            body: caption
          });
          break;

        case "audio":
          // Para áudios, enviar como PTT (Push To Talk) se for OGG
          const isPTT = mediaInfo.extension === "ogg";
          await SendWhatsAppMedia({
            media: mediaSrc,
            ticket,
            body: isPTT ? undefined : caption // PTT não tem caption
          });
          break;

        case "document":
          await SendWhatsAppMedia({
            media: mediaSrc,
            ticket,
            body: caption
          });
          break;

        case "sticker":
          // Stickers não têm caption
          await SendWhatsAppMedia({
            media: mediaSrc,
            ticket,
            body: undefined
          });
          break;

        default:
          throw new Error(`Tipo de mídia não implementado: ${mediaInfo.type}`);
      }

      logger.info({
        ticketId: ticket.id,
        fileId: file.id,
        fileName: file.name,
        mediaType: mediaInfo.type,
        fileSize: fs.statSync(fullPath).size
      }, "Media file sent successfully");

    } catch (error) {
      logger.error({
        error,
        ticketId: ticket.id,
        fileId: file.id,
        fileName: file.name
      }, "Error sending media file");
      throw error;
    }
  }

  /**
   * Envia múltiplos arquivos de mídia
   */
  static async sendMultipleMediaFiles(
    ticket: Ticket,
    files: FilesOptions[],
    delayBetweenFiles: number = 1000
  ): Promise<void> {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        await this.sendMediaFile(ticket, file);
        
        // Delay entre arquivos para evitar spam
        if (i < files.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delayBetweenFiles));
        }
      } catch (error) {
        logger.error({
          error,
          ticketId: ticket.id,
          fileId: file.id,
          fileName: file.name
        }, "Error sending file in batch");
        // Continuar com próximo arquivo mesmo se um falhar
      }
    }
  }

  /**
   * Cria preview de arquivo para o agente
   */
  static async createFilePreview(file: FilesOptions): Promise<{
    name: string;
    type: string;
    size: string;
    preview: string;
    supported: boolean;
  }> {
    const publicFolder = path.resolve(__dirname, "..", "..", "..", "public");
    const fullPath = path.resolve(publicFolder, file.path);

    let fileSize = "0 KB";
    let supported = false;

    try {
      if (fs.existsSync(fullPath)) {
        const stats = fs.statSync(fullPath);
        const sizeMB = stats.size / (1024 * 1024);
        fileSize = sizeMB > 1 ? `${sizeMB.toFixed(2)} MB` : `${(stats.size / 1024).toFixed(2)} KB`;
        
        const validation = this.validateFile(fullPath);
        supported = validation.valid;
      }
    } catch (error) {
      logger.error({ error, filePath: fullPath }, "Error getting file stats");
    }

    const mediaInfo = this.detectFileType(file.path);
    
    return {
      name: file.name,
      type: mediaInfo?.description || "Tipo desconhecido",
      size: fileSize,
      preview: file.description || "Sem descrição",
      supported
    };
  }

  /**
   * Gera relatório de compatibilidade de arquivos
   */
  static async generateCompatibilityReport(fileListId: number): Promise<{
    total: number;
    supported: number;
    unsupported: number;
    details: Array<{
      name: string;
      supported: boolean;
      reason?: string;
    }>;
  }> {
    const files = await FilesOptions.findAll({
      where: { fileId: fileListId }
    });

    const details = [];
    let supported = 0;
    let unsupported = 0;

    for (const file of files) {
      const publicFolder = path.resolve(__dirname, "..", "..", "..", "public");
      const fullPath = path.resolve(publicFolder, file.path);
      
      const validation = this.validateFile(fullPath);
      
      if (validation.valid) {
        supported++;
        details.push({
          name: file.name,
          supported: true
        });
      } else {
        unsupported++;
        details.push({
          name: file.name,
          supported: false,
          reason: validation.error
        });
      }
    }

    return {
      total: files.length,
      supported,
      unsupported,
      details
    };
  }
}

export default QueueMediaService;
