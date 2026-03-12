import { Request, Response } from "express";
import QueueTemplateService from "../services/QueueServices/QueueTemplateService";
import AppError from "../errors/AppError";

export const getTemplates = async (req: Request, res: Response): Promise<Response> => {
  try {
    const templates = QueueTemplateService.getTemplates();
    return res.json(templates);
  } catch (error) {
    throw new AppError("Erro ao buscar templates", 500);
  }
};

export const createFromTemplates = async (req: Request, res: Response): Promise<Response> => {
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

export const setupComplete = async (req: Request, res: Response): Promise<Response> => {
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
