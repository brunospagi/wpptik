import { Request, Response } from "express";
import QueueTemplateService from "../services/QueueServices/QueueTemplateService";
import QueueMediaService from "../services/QueueServices/QueueMediaService";
import QueueMetricsService from "../services/QueueServices/QueueMetricsService";
import QueueAIService from "../services/QueueServices/QueueAIService";
import AppError from "../errors/AppError";

// Templates de Filas
export const getQueueTemplates = async (req: Request, res: Response): Promise<Response> => {
  try {
    const templates = QueueTemplateService.getTemplates();
    return res.json(templates);
  } catch (error) {
    throw new AppError("Erro ao buscar templates de filas", 500);
  }
};

export const createQueuesFromTemplates = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { companyId } = req.user;
    const { selectedTemplates } = req.body;

    if (!selectedTemplates || !Array.isArray(selectedTemplates)) {
      throw new AppError("selectedTemplates deve ser um array", 400);
    }

    const queues = await QueueTemplateService.createQueuesFromTemplates(
      companyId, 
      selectedTemplates
    );

    return res.json({
      message: "Filas criadas com sucesso",
      queues,
      count: queues.length
    });
  } catch (error) {
    throw new AppError("Erro ao criar filas", 500);
  }
};

export const setupCompleteEnvironment = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { companyId } = req.user;

    const result = await QueueTemplateService.setupCompleteEnvironment(companyId);

    return res.json({
      message: "Ambiente configurado com sucesso",
      ...result
    });
  } catch (error) {
    throw new AppError("Erro ao configurar ambiente", 500);
  }
};

// Suporte a Mídia
export const getSupportedMediaTypes = async (req: Request, res: Response): Promise<Response> => {
  try {
    const mediaTypes = QueueMediaService.getSupportedMediaTypes();
    return res.json(mediaTypes);
  } catch (error) {
    throw new AppError("Erro ao buscar tipos de mídia", 500);
  }
};

export const validateMediaFile = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { filePath } = req.body;

    if (!filePath) {
      throw new AppError("filePath é obrigatório", 400);
    }

    const validation = QueueMediaService.validateFile(filePath);
    return res.json(validation);
  } catch (error) {
    throw new AppError("Erro ao validar arquivo", 500);
  }
};

export const getCompatibilityReport = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { fileListId } = req.params;

    if (!fileListId) {
      throw new AppError("fileListId é obrigatório", 400);
    }

    const report = await QueueMediaService.generateCompatibilityReport(Number(fileListId));
    return res.json(report);
  } catch (error) {
    throw new AppError("Erro ao gerar relatório de compatibilidade", 500);
  }
};

// Métricas e Analytics
export const getQueueMetrics = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { queueId } = req.params;
    const { startDate, endDate } = req.query;

    if (!queueId) {
      throw new AppError("queueId é obrigatório", 400);
    }

    const period = {
      startDate: startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: endDate ? new Date(endDate as string) : new Date()
    };

    const metrics = await QueueMetricsService.getQueueMetrics(Number(queueId), period);
    return res.json(metrics);
  } catch (error) {
    throw new AppError("Erro ao buscar métricas da fila", 500);
  }
};

export const getOverallMetrics = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { companyId } = req.user;
    const { startDate, endDate } = req.query;

    const period = {
      startDate: startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: endDate ? new Date(endDate as string) : new Date()
    };

    const metrics = await QueueMetricsService.getOverallMetrics(companyId, period);
    return res.json(metrics);
  } catch (error) {
    throw new AppError("Erro ao buscar métricas gerais", 500);
  }
};

export const getPerformanceReport = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { companyId } = req.user;
    const { days = 30 } = req.query;

    const report = await QueueMetricsService.generatePerformanceReport(
      companyId, 
      Number(days)
    );

    return res.json(report);
  } catch (error) {
    throw new AppError("Erro ao gerar relatório de performance", 500);
  }
};

// Análise com IA
export const analyzeMessage = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { companyId } = req.user;
    const { message } = req.body;

    if (!message) {
      throw new AppError("message é obrigatória", 400);
    }

    const sentiment = await QueueAIService.analyzeSentiment(message, companyId);
    return res.json(sentiment);
  } catch (error) {
    throw new AppError("Erro ao analisar mensagem", 500);
  }
};

export const testAISearch = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { query, queueId, ticketId, useAdvancedAI = true } = req.body;

    if (!query || !queueId || !ticketId) {
      throw new AppError("query, queueId e ticketId são obrigatórios", 400);
    }

    // Simular objetos para teste
    const mockTicket = { 
      id: ticketId, 
      companyId: req.user.companyId 
    } as any;
    
    const mockQueue = { 
      id: queueId, 
      fileListId: 1 // Assumir que existe uma lista
    } as any;

    const result = await QueueAIService.searchWithAI({
      query,
      ticket: mockTicket,
      queue: mockQueue,
      maxResults: 5,
      useAdvancedAI
    });

    return res.json(result);
  } catch (error) {
    throw new AppError("Erro ao testar busca com IA", 500);
  }
};

// Dashboard de Configuração
export const getDashboardData = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { companyId } = req.user;

    // Buscar dados do dashboard
    const [
      templates,
      mediaTypes,
      overallMetrics,
      performanceReport
    ] = await Promise.all([
      QueueTemplateService.getTemplates(),
      QueueMediaService.getSupportedMediaTypes(),
      QueueMetricsService.getOverallMetrics(companyId, {
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        endDate: new Date()
      }),
      QueueMetricsService.generatePerformanceReport(companyId, 7)
    ]);

    return res.json({
      templates: {
        available: templates.length,
        categories: [...new Set(templates.map(t => t.useCase))]
      },
      mediaSupport: {
        totalTypes: Object.keys(mediaTypes).length,
        categories: [...new Set(Object.values(mediaTypes).map(m => m.type))]
      },
      metrics: overallMetrics,
      performance: {
        summary: performanceReport.summary,
        topRecommendations: performanceReport.recommendations.slice(0, 3)
      }
    });
  } catch (error) {
    throw new AppError("Erro ao buscar dados do dashboard", 500);
  }
};
