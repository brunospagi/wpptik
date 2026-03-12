import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import ImageProcessor from './ImageProcessor';

const execAsync = promisify(exec);

export interface GifProcessResult {
  text: string;
  frameCount: number;
  duration: number;
  metadata: {
    format: string;
    resolution?: string;
    fps?: number;
    hasText: boolean;
    confidence: number;
  };
}

export default class GifProcessor {
  /**
   * Verifica se o arquivo é um GIF válido
   */
  static isValidGif(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return ext === '.gif' && fs.existsSync(filePath);
  }

  /**
   * Extrai texto de frames-chave do GIF usando OCR
   */
  static async extractText(filePath: string): Promise<GifProcessResult> {
    if (!this.isValidGif(filePath)) {
      throw new Error('Arquivo GIF inválido ou não encontrado');
    }

    const tempDir = path.join(path.dirname(filePath), 'temp');
    const framePattern = path.join(tempDir, 'frame_%03d.png');
    
    try {
      // Criar diretório temporário
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Obter metadados do GIF
      const metadata = await this.getGifMetadata(filePath);
      
      // Extrair frames-chave usando ffmpeg
      const frameFiles = await this.extractKeyFrames(filePath, framePattern, metadata.frameCount);
      
      // Processar OCR em cada frame
      const frameTexts: string[] = [];
      let totalConfidence = 0;
      let framesWithText = 0;
      
      for (const frameFile of frameFiles) {
        try {
          if (ImageProcessor.isValidImage(frameFile)) {
            const result = await ImageProcessor.extractText(frameFile);
            if (result.text && result.text.length > 3) {
              frameTexts.push(`[Frame ${frameFiles.indexOf(frameFile) + 1}]: ${result.text}`);
              totalConfidence += result.confidence;
              framesWithText++;
            }
          }
        } catch (error) {
          console.warn(`[GifProcessor] Erro ao processar frame ${frameFile}:`, error);
        }
      }
      
      // Limpar arquivos temporários
      this.cleanupFrames(frameFiles);
      
      const avgConfidence = framesWithText > 0 ? totalConfidence / framesWithText : 0;
      const combinedText = frameTexts.length > 0 
        ? frameTexts.join('\n\n') 
        : '[GIF processado - nenhum texto detectado nos frames]';
      
      return {
        text: combinedText,
        frameCount: metadata.frameCount,
        duration: metadata.duration,
        metadata: {
          format: 'gif',
          resolution: metadata.resolution,
          fps: metadata.fps,
          hasText: frameTexts.length > 0,
          confidence: avgConfidence
        }
      };
      
    } catch (error: any) {
      // Limpar diretório temporário em caso de erro
      if (fs.existsSync(tempDir)) {
        this.cleanupDirectory(tempDir);
      }
      throw new Error(`Erro ao processar GIF: ${error.message}`);
    }
  }

  /**
   * Obtém metadados do GIF usando ffprobe
   */
  private static async getGifMetadata(filePath: string): Promise<{
    frameCount: number;
    duration: number;
    resolution?: string;
    fps?: number;
  }> {
    try {
      const { stdout } = await execAsync(
        `ffprobe -v quiet -print_format json -show_format -show_streams "${filePath}"`
      );
      
      const info = JSON.parse(stdout);
      const videoStream = info.streams?.find((s: any) => s.codec_type === 'video');
      
      const duration = parseFloat(info.format?.duration || '1');
      const frameCount = parseInt(videoStream?.nb_frames || '10');
      const fps = videoStream ? parseFloat(videoStream.r_frame_rate?.split('/')[0] || '10') : 10;
      
      return {
        frameCount: Math.max(frameCount, 1),
        duration: Math.max(duration, 0.1),
        resolution: videoStream ? `${videoStream.width}x${videoStream.height}` : undefined,
        fps: Math.max(fps, 1)
      };
    } catch (error) {
      console.warn('[GifProcessor] Falha ao obter metadados, usando valores padrão');
      return {
        frameCount: 10,
        duration: 2.0,
        fps: 5
      };
    }
  }

  /**
   * Extrai frames-chave do GIF usando ffmpeg
   */
  private static async extractKeyFrames(gifPath: string, framePattern: string, totalFrames: number): Promise<string[]> {
    // Extrair no máximo 5 frames distribuídos uniformemente
    const maxFrames = Math.min(5, totalFrames);
    const frameStep = Math.max(1, Math.floor(totalFrames / maxFrames));
    
    const command = `ffmpeg -i "${gifPath}" -vf "select='not(mod(n,${frameStep}))'" -vsync vfr -frames:v ${maxFrames} "${framePattern}" -y`;
    
    try {
      await execAsync(command);
      
      // Listar arquivos de frame criados
      const frameFiles: string[] = [];
      const tempDir = path.dirname(framePattern);
      
      for (let i = 1; i <= maxFrames; i++) {
        const frameFile = path.join(tempDir, `frame_${i.toString().padStart(3, '0')}.png`);
        if (fs.existsSync(frameFile)) {
          frameFiles.push(frameFile);
        }
      }
      
      return frameFiles;
      
    } catch (error: any) {
      throw new Error(`Erro no ffmpeg ao extrair frames: ${error.message}`);
    }
  }

  /**
   * Remove arquivos de frame temporários
   */
  private static cleanupFrames(frameFiles: string[]): void {
    frameFiles.forEach(file => {
      try {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      } catch (error) {
        console.warn(`[GifProcessor] Erro ao remover frame temporário ${file}`);
      }
    });
  }

  /**
   * Remove diretório temporário
   */
  private static cleanupDirectory(dirPath: string): void {
    try {
      if (fs.existsSync(dirPath)) {
        fs.rmSync(dirPath, { recursive: true, force: true });
      }
    } catch (error) {
      console.warn(`[GifProcessor] Erro ao remover diretório temporário ${dirPath}`);
    }
  }
}
