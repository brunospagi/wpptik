import { Request, Response } from "express";
import CleanFlowbuilderOrphansService from "../services/maintenance/CleanFlowbuilderOrphansService";

export const cleanFlowbuilderOrphans = async (req: Request, res: Response): Promise<Response> => {
  const result = await CleanFlowbuilderOrphansService();
  return res.status(200).json({ ok: true, result });
};

export default {
  cleanFlowbuilderOrphans,
};
