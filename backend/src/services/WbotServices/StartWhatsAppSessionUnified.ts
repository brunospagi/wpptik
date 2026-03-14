import { initWASocket } from "../../libs/wbot";
import { WhatsAppFactory } from "../../libs/whatsapp";
import Whatsapp from "../../models/Whatsapp";
import { wbotMessageListener } from "./wbotMessageListener";
import { getIO } from "../../libs/socket";
import wbotMonitor from "./wbotMonitor";
import logger from "../../utils/logger";
import * as Sentry from "@sentry/node";

/**
 * Inicia sessão WhatsApp usando adapters (Baileys ou Official API)
 * Versão unificada que deteta automaticamente o tipo de canal
 */
export const StartWhatsAppSessionUnified = async (
  whatsapp: Whatsapp,
  companyId: number
): Promise<void> => {
  const channelType = whatsapp.channel || whatsapp.channelType || "baileys";

  logger.info(`[StartSession] A iniciar ${channelType} para whatsappId=${whatsapp.id}`);

  await whatsapp.update({ status: "OPENING", qrcode: "" });

  const io = getIO();
  io.of(`/workspace-${companyId}`)
    .emit(`company-${companyId}-whatsappSession`, {
      action: "update",
      session: whatsapp
    });

  try {

    if (channelType === "baileys" || channelType === "whatsapp") {

      // ===== BAILEYS (não oficial local) =====
      logger.info(`[StartSession] Usando Baileys para whatsappId=${whatsapp.id}`);

      const wbot = await initWASocket(whatsapp);

      if (wbot.id) {
        wbotMessageListener(wbot, companyId);
        wbotMonitor(wbot, whatsapp, companyId);

        logger.info(`[StartSession] Baileys iniciado com sucesso: ${wbot.user?.id}`);
      }

    } else if (channelType === "official") {

      // ===== WHATSAPP BUSINESS API OFICIAL =====
      logger.info(`[StartSession] Usando Official API para whatsappId=${whatsapp.id}`);

      const adapter = await WhatsAppFactory.createAdapter(whatsapp);
      await adapter.initialize();

      adapter.onConnectionUpdate((status) => {
        logger.info(`[StartSession] Official API status changed: ${status}`);

        if (status === "connected") {
          whatsapp.update({ status: "CONNECTED" });
        } else if (status === "disconnected") {
          whatsapp.update({ status: "DISCONNECTED" });
        }

        io.of(`/workspace-${companyId}`)
          .emit(`company-${companyId}-whatsappSession`, {
            action: "update",
            session: whatsapp
          });
      });

      adapter.onMessage((message) => {
        logger.debug(`[StartSession] Mensagem recebida via Official API: ${message.id}`);
      });

      await whatsapp.update({
        status: "CONNECTED",
        number: adapter.getPhoneNumber()
      });

      logger.info(`[StartSession] Official API conectada: ${adapter.getPhoneNumber()}`);

      io.of(`/workspace-${companyId}`)
        .emit(`company-${companyId}-whatsappSession`, {
          action: "update",
          session: whatsapp
        });

    } else if (channelType === "evolution") {

      // ===== EVOLUTION API =====
      logger.info(`[StartSession] Usando Evolution API para whatsappId=${whatsapp.id}`);

      try {
        const adapter = await WhatsAppFactory.createAdapter(whatsapp);

        // NOVO: Escuta o QR Code vindo do Adapter e envia para o ecrã do painel
        adapter.onQRCode(async (qrCodeBase64) => {
          logger.info(`[StartSession] QR Code recebido da Evolution para whatsappId=${whatsapp.id}`);
          await whatsapp.update({ qrcode: qrCodeBase64, status: "qrcode" });

          io.of(`/workspace-${companyId}`).emit(`company-${companyId}-whatsappSession`, {
            action: "update",
            session: whatsapp
          });
        });

        // Inicializa (Se não existir, ele vai criar e vai disparar o onQRCode acima)
        await adapter.initialize();

        const currentStatus = adapter.getConnectionStatus();

        await whatsapp.update({
          status: currentStatus === "connected" ? "CONNECTED" :
                  currentStatus === "qrcode" ? "qrcode" : "DISCONNECTED"
        });

      } catch (error) {
        logger.error(`[StartSession] Erro na rotina da Evolution: ${error}`);
        await whatsapp.update({ status: "DISCONNECTED" });
      }

      logger.info(`[StartSession] Rotina da Evolution finalizada para whatsappId=${whatsapp.id}`);

      io.of(`/workspace-${companyId}`)
        .emit(`company-${companyId}-whatsappSession`, {
          action: "update",
          session: whatsapp
        });

    } else {
      throw new Error(`Tipo de canal não suportado: ${channelType}`);
    }

  } catch (err: any) {
    Sentry.captureException(err);
    logger.error(`[StartSession] Erro ao iniciar sessão: ${err.message}`);

    await whatsapp.update({ status: "DISCONNECTED" });

    io.of(`/workspace-${companyId}`)
      .emit(`company-${companyId}-whatsappSession`, {
        action: "update",
        session: whatsapp
      });

    throw err;
  }
};

/**
 * Para manter compatibilidade, exportar também a versão original
 */
export const StartWhatsAppSession = StartWhatsAppSessionUnified;

export default StartWhatsAppSessionUnified;
