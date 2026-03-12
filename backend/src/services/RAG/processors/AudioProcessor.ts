import path from 'path';
import fs from 'fs';
import OpenAI from 'openai';

export interface AudioProcessResult {
  text: string;
  duration: number;
  metadata: {
    format: string;
    channels?: number;
    sampleRate?: number;
    bitrate?: number;
  };
}

export default class AudioProcessor {
  /**
   * Verifica se o arquivo é um áudio suportado
   */
  static isValidAudio(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    const supportedFormats = ['.mp3', '.wav', '.m4a', '.flac', '.aac', '.ogg', '.wma'];
    return supportedFormats.includes(ext) && fs.existsSync(filePath);
  }

  /**
   * Transcreve áudio usando Whisper
   */
  static async extractText(filePath: string, openaiApiKey?: string): Promise<AudioProcessResult> {
    if (!this.isValidAudio(filePath)) {
      throw new Error('Arquivo de áudio inválido ou não encontrado');
    }

    try {
      // Obter metadados do áudio
      const metadata = await this.getAudioMetadata(filePath);
      
      // Transcrever áudio
      let transcription = '';
      if (openaiApiKey) {
        transcription = await this.transcribeAudio(filePath, openaiApiKey);
      } else {
        transcription = `[Áudio processado - transcrição requer API Key da OpenAI]`;
      }
      
      return {
        text: transcription,
        duration: metadata.duration,
        metadata: {
          format: path.extname(filePath).substring(1),
          channels: metadata.channels,
          sampleRate: metadata.sampleRate,
          bitrate: metadata.bitrate
        }
      };
      
    } catch (error: any) {
      throw new Error(`Erro ao processar áudio: ${error.message}`);
    }
  }

  /**
   * Obtém metadados do áudio (implementação básica)
   */
  private static async getAudioMetadata(filePath: string): Promise<{
    duration: number;
    channels?: number;
    sampleRate?: number;
    bitrate?: number;
  }> {
    try {
      const stats = fs.statSync(filePath);
      const ext = path.extname(filePath).toLowerCase();
      
      // Estimativa básica baseada no tamanho do arquivo
      let estimatedDuration = 0;
      if (ext === '.mp3') {
        // Estimativa: ~1MB por minuto para MP3 128kbps
        estimatedDuration = (stats.size / (1024 * 1024)) * 60;
      } else if (ext === '.wav') {
        // Estimativa: ~10MB por minuto para WAV 44.1kHz 16-bit stereo
        estimatedDuration = (stats.size / (1024 * 1024)) * 6;
      } else {
        // Estimativa genérica
        estimatedDuration = (stats.size / (1024 * 1024)) * 30;
      }
      
      return {
        duration: Math.max(estimatedDuration, 1), // Mínimo 1 segundo
        channels: 2, // Assumir stereo por padrão
        sampleRate: 44100, // Padrão CD quality
        bitrate: ext === '.mp3' ? 128 : undefined
      };
      
    } catch (error) {
      console.warn('[AudioProcessor] Falha ao obter metadados, usando valores padrão');
      return {
        duration: 60, // 1 minuto padrão
        channels: 2,
        sampleRate: 44100
      };
    }
  }

  /**
   * Transcreve áudio usando OpenAI Whisper
   */
  private static async transcribeAudio(audioPath: string, apiKey: string): Promise<string> {
    try {
      const openai = new OpenAI({ apiKey });
      
      const audioFile = fs.createReadStream(audioPath);
      
      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: 'pt',
        response_format: 'text'
      });
      
      return typeof transcription === 'string' ? transcription : (transcription as any)?.text || '';
      
    } catch (error: any) {
      console.warn(`[AudioProcessor] Falha na transcrição: ${error.message}`);
      return `[Áudio processado - transcrição não disponível: ${error.message}]`;
    }
  }
}
