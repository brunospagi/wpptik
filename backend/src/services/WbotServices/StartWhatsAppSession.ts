import Whatsapp from "../../models/Whatsapp";
import { getIO } from "../../libs/socket";
import logger from "../../utils/logger";
import * as Sentry from "@sentry/node";
import { WhatsAppFactory } from "../../libs/whatsapp/WhatsAppFactory";

import { initWASocket } from "../../libs/wbot";
import { wbotMessageListener } from "./wbotMessageListener";
import wbotMonitor from "./wbotMonitor";

export const StartWhatsAppSession = async (
  whatsapp: Whatsapp,
  companyId: number
): Promise<void> => {

  const io = getIO();

  logger.info(
    `[StartSession] Iniciando ${whatsapp.channel || "baileys"} para whatsappId=${whatsapp.id}`
  );

  await whatsapp.update({
    status: "OPENING",
    qrcode: ""
  });

  io.of(`/workspace-${companyId}`).emit(
    `company-${companyId}-whatsappSession`,
    {
      action: "update",
      session: whatsapp
    }
  );

  try {

    /* ======================================================
       EVOLUTION API
    ====================================================== */

    if (whatsapp.channel === "evolution") {

      logger.info(
        `[StartSession] Usando Evolution API para whatsappId=${whatsapp.id}`
      );

      try {
        const adapter = await WhatsAppFactory.createAdapter(whatsapp);
        await adapter.initialize();

        const currentStatus = adapter.getConnectionStatus();

        await whatsapp.update({
          status: currentStatus === "connected" ? "CONNECTED" :
                  currentStatus === "qrcode" ? "qrcode" : "DISCONNECTED"
        });

      } catch (error) {
        logger.error(`[StartSession] Erro ao inicializar Evolution: ${error}`);
        await whatsapp.update({ status: "DISCONNECTED" });
      }

      io.of(`/workspace-${companyId}`).emit(
        `company-${companyId}-whatsappSession`,
        {
          action: "update",
          session: whatsapp
        }
      );

      return;
    }

    /* ======================================================
       WHATSAPP CLOUD API (OFFICIAL)
    ====================================================== */

    if (whatsapp.channel === "official") {

      logger.info(
        `[StartSession] Usando WhatsApp Cloud API para whatsappId=${whatsapp.id}`
      );

      /**
       * Também usa webhook
       */

      await whatsapp.update({
        status: "CONNECTED"
      });

      io.of(`/workspace-${companyId}`).emit(
        `company-${companyId}-whatsappSession`,
        {
          action: "update",
          session: whatsapp
        }
      );

      return;
    }

    /* ======================================================
       BAILEYS
    ====================================================== */

    logger.info(
      `[StartSession] Usando Baileys para whatsappId=${whatsapp.id}`
    );

    const wbot = await initWASocket(whatsapp);

    if (wbot?.id) {

      wbotMessageListener(wbot, companyId);

      wbotMonitor(wbot, whatsapp, companyId);

      logger.info(
        `[StartSession] Baileys iniciado whatsappId=${whatsapp.id}`
      );
    }

  } catch (err) {

    Sentry.captureException(err);

    logger.error(
      `[StartSession] erro iniciar sessão ${whatsapp.id}`,
      err
    );

    await whatsapp.update({
      status: "DISCONNECTED"
    });

    io.of(`/workspace-${companyId}`).emit(
      `company-${companyId}-whatsappSession`,
      {
        action: "update",
        session: whatsapp
      }
    );
  }
};
