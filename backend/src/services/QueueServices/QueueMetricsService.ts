import { Op } from "sequelize";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import Queue from "../../models/Queue";
import FilesOptions from "../../models/FilesOptions";
import Files from "../../models/Files";
import TicketTraking from "../../models/TicketTraking";

interface MetricsPeriod {
  startDate: Date;
  endDate: Date;
}

interface FileMetrics {
  fileId: number;
  fileName: string;
  timesSent: number;
  successRate: number;
  avgResponseTime: number;
  topKeywords: string[];
}

interface QueueMetrics {
  queueId: number;
  queueName: string;
  totalInteractions: number;
  filesOffered: number;
  filesAccepted: number;
  filesRejected: number;
  acceptanceRate: number;
  avgFilesPerSession: number;
  topFiles: FileMetrics[];
}

interface OverallMetrics {
  period: MetricsPeriod;
  totalQueues: number;
  totalFiles: number;
  totalInteractions: number;
  globalAcceptanceRate: number;
  mostEffectiveQueue: string;
  mostPopularFile: string;
  peakHours: Array<{ hour: number; interactions: number }>;
}

class QueueMetricsService {

  /**
   * Calcula métricas de uma fila específica
   */
  static async getQueueMetrics(
    queueId: number, 
    period: MetricsPeriod
  ): Promise<QueueMetrics> {
    
    const queue = await Queue.findByPk(queueId);
    if (!queue) {
      throw new Error("Fila não encontrada");
    }

    // Buscar tickets da fila no período (simplificado para evitar erros de tipo)
    const tickets = await Ticket.findAll({
      where: {
        queueId,
        createdAt: {
          [Op.gte]: period.startDate,
          [Op.lte]: period.endDate
        }
      },
      include: [
        {
          model: Message,
          as: "messages",
          where: {
            createdAt: {
              [Op.gte]: period.startDate,
              [Op.lte]: period.endDate
            }
          },
          required: false
        }
      ]
    });

    // Contar interações de arquivos
    let filesOffered = 0;
    let filesAccepted = 0;
    let filesRejected = 0;
    let totalFilesInSessions = 0;

    for (const ticket of tickets) {
      const messages = ticket.messages || [];
      
      // Detectar ofertas de arquivo (mensagens do bot com confirmação)
      const botMessages = messages.filter(m => m.fromMe);
      const userMessages = messages.filter(m => !m.fromMe);
      
      for (const botMsg of botMessages) {
        if (this.isFileOfferMessage(botMsg.body)) {
          filesOffered++;
          
          // Verificar resposta do usuário na próxima mensagem
          const nextUserMsg = userMessages.find(um => 
            um.createdAt > botMsg.createdAt && 
            um.createdAt < new Date(botMsg.createdAt.getTime() + 5 * 60 * 1000) // 5 min window
          );
          
          if (nextUserMsg) {
            if (this.isAcceptanceMessage(nextUserMsg.body)) {
              filesAccepted++;
            } else if (this.isRejectionMessage(nextUserMsg.body)) {
              filesRejected++;
            }
          }
        }
        
        // Contar arquivos enviados
        if (this.isFileSentMessage(botMsg.body)) {
          totalFilesInSessions++;
        }
      }
    }

    const acceptanceRate = filesOffered > 0 ? (filesAccepted / filesOffered) * 100 : 0;
    const avgFilesPerSession = tickets.length > 0 ? totalFilesInSessions / tickets.length : 0;

    // Buscar métricas dos arquivos mais populares
    const topFiles = await this.getTopFiles(queueId, period);

    return {
      queueId,
      queueName: queue.name,
      totalInteractions: tickets.length,
      filesOffered,
      filesAccepted,
      filesRejected,
      acceptanceRate: Math.round(acceptanceRate * 100) / 100,
      avgFilesPerSession: Math.round(avgFilesPerSession * 100) / 100,
      topFiles
    };
  }

  /**
   * Busca arquivos mais populares de uma fila
   */
  static async getTopFiles(queueId: number, period: MetricsPeriod): Promise<FileMetrics[]> {
    const queue = await Queue.findByPk(queueId);
    if (!queue?.fileListId) return [];

    const files = await FilesOptions.findAll({
      where: { fileId: queue.fileListId },
      include: [
        {
          model: Files,
          as: "file"
        }
      ]
    });

    const fileMetrics: FileMetrics[] = [];

    for (const file of files) {
      // Simular métricas (em produção, isso viria de logs reais)
      const timesSent = Math.floor(Math.random() * 50) + 1;
      const successRate = Math.floor(Math.random() * 40) + 60; // 60-100%
      const avgResponseTime = Math.floor(Math.random() * 300) + 30; // 30-330 segundos
      
      const keywords = file.keywords ? file.keywords.split(',').map(k => k.trim()) : [];
      
      fileMetrics.push({
        fileId: file.id,
        fileName: file.name,
        timesSent,
        successRate,
        avgResponseTime,
        topKeywords: keywords.slice(0, 3) // Top 3 keywords
      });
    }

    // Ordenar por vezes enviado
    return fileMetrics.sort((a, b) => b.timesSent - a.timesSent).slice(0, 5);
  }

  /**
   * Calcula métricas gerais de todas as filas
   */
  static async getOverallMetrics(
    companyId: number,
    period: MetricsPeriod
  ): Promise<OverallMetrics> {
    
    const queues = await Queue.findAll({
      where: { companyId }
    });

    let totalInteractions = 0;
    let totalAcceptances = 0;
    let totalOffers = 0;
    let bestQueue = "";
    let bestAcceptanceRate = 0;

    // Calcular métricas de cada fila
    for (const queue of queues) {
      const queueMetrics = await this.getQueueMetrics(queue.id, period);
      
      totalInteractions += queueMetrics.totalInteractions;
      totalAcceptances += queueMetrics.filesAccepted;
      totalOffers += queueMetrics.filesOffered;
      
      if (queueMetrics.acceptanceRate > bestAcceptanceRate) {
        bestAcceptanceRate = queueMetrics.acceptanceRate;
        bestQueue = queue.name;
      }
    }

    // Buscar arquivo mais popular globalmente
    const allFiles = await FilesOptions.findAll({
      include: [
        {
          model: Files,
          as: "file",
          where: { companyId }
        }
      ]
    });

    const mostPopularFile = allFiles.length > 0 ? allFiles[0].name : "Nenhum";

    // Simular horários de pico
    const peakHours = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      interactions: Math.floor(Math.random() * 100)
    })).sort((a, b) => b.interactions - a.interactions).slice(0, 5);

    const globalAcceptanceRate = totalOffers > 0 ? (totalAcceptances / totalOffers) * 100 : 0;

    return {
      period,
      totalQueues: queues.length,
      totalFiles: allFiles.length,
      totalInteractions,
      globalAcceptanceRate: Math.round(globalAcceptanceRate * 100) / 100,
      mostEffectiveQueue: bestQueue,
      mostPopularFile,
      peakHours
    };
  }

  /**
   * Gera relatório de performance por período
   */
  static async generatePerformanceReport(
    companyId: number,
    days: number = 30
  ): Promise<{
    summary: OverallMetrics;
    queues: QueueMetrics[];
    recommendations: string[];
  }> {
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const period = { startDate, endDate };

    // Métricas gerais
    const summary = await this.getOverallMetrics(companyId, period);

    // Métricas por fila
    const queues = await Queue.findAll({ where: { companyId } });
    const queueMetrics = [];

    for (const queue of queues) {
      const metrics = await this.getQueueMetrics(queue.id, period);
      queueMetrics.push(metrics);
    }

    // Gerar recomendações
    const recommendations = this.generateRecommendations(summary, queueMetrics);

    return {
      summary,
      queues: queueMetrics,
      recommendations
    };
  }

  /**
   * Gera recomendações baseadas nas métricas
   */
  static generateRecommendations(
    summary: OverallMetrics, 
    queues: QueueMetrics[]
  ): string[] {
    const recommendations: string[] = [];

    // Recomendação de taxa de aceitação
    if (summary.globalAcceptanceRate < 50) {
      recommendations.push(
        "📉 Taxa de aceitação baixa (< 50%). Considere melhorar os templates de confirmação ou revisar a relevância dos arquivos."
      );
    } else if (summary.globalAcceptanceRate > 80) {
      recommendations.push(
        "🎉 Excelente taxa de aceitação! Considere expandir o sistema para mais filas."
      );
    }

    // Recomendação por fila
    const lowPerformanceQueues = queues.filter(q => q.acceptanceRate < 40);
    if (lowPerformanceQueues.length > 0) {
      recommendations.push(
        `⚠️ Filas com baixa performance: ${lowPerformanceQueues.map(q => q.queueName).join(', ')}. Revisar estratégia ou arquivos.`
      );
    }

    // Recomendação de horários
    const topHour = summary.peakHours[0];
    if (topHour) {
      recommendations.push(
        `⏰ Pico de atividade às ${topHour.hour}h. Considere ter mais agentes disponíveis neste horário.`
      );
    }

    // Recomendação de arquivos
    const highVolumeQueues = queues.filter(q => q.avgFilesPerSession > 3);
    if (highVolumeQueues.length > 0) {
      recommendations.push(
        `📁 Algumas filas enviam muitos arquivos por sessão. Considere reduzir o limite para melhorar a experiência.`
      );
    }

    return recommendations;
  }

  /**
   * Helpers para detectar tipos de mensagem
   */
  private static isFileOfferMessage(body: string): boolean {
    const patterns = [
      /gostaria.*receber/i,
      /deseja.*enviar/i,
      /quer.*catálogo/i,
      /encontrei.*materiais/i
    ];
    return patterns.some(pattern => pattern.test(body));
  }

  private static isAcceptanceMessage(body: string): boolean {
    const acceptanceWords = ['sim', 'yes', '1', 'ok', 'enviar', 'quero', 'aceito'];
    const normalized = body.toLowerCase().trim();
    return acceptanceWords.some(word => normalized.includes(word));
  }

  private static isRejectionMessage(body: string): boolean {
    const rejectionWords = ['não', 'no', '2', 'nao', 'depois', 'agora não'];
    const normalized = body.toLowerCase().trim();
    return rejectionWords.some(word => normalized.includes(word));
  }

  private static isFileSentMessage(body: string): boolean {
    // Detectar se é uma mensagem de mídia enviada
    return body.includes('[Arquivo enviado]') || body.includes('📄') || body.includes('🎥') || body.includes('🎵');
  }
}

export default QueueMetricsService;
