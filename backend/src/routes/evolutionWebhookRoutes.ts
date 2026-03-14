import express from "express";
import * as EvolutionWebhookController from "../controllers/EvolutionWebhookController";

const evolutionWebhookRoutes = express.Router();

/**
 * Rota para receber os eventos da Evolution API
 * O ":whatsappId" permite que o controlador saiba qual a conexão que está a enviar o webhook
 */
evolutionWebhookRoutes.post(
  "/evolution/webhook/:whatsappId",
  EvolutionWebhookController.receiveWebhook
);

export default evolutionWebhookRoutes;
