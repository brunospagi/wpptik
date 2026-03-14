import { Request, Response } from "express";
import fs from "fs";
import path from "path";

import Whatsapp from "../models/Whatsapp";
import CompaniesSettings from "../models/CompaniesSettings";

import CreateMessageService from "../services/MessageServices/CreateMessageService";
import FindOrCreateTicketService from "../services/TicketServices/FindOrCreateTicketService";
import CreateOrUpdateContactService from "../services/ContactServices/CreateOrUpdateContactService";

import logger from "../utils/logger";

export const receiveWebhook = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { whatsappId } = req.params;
    const payload = req.body;

    if (!payload?.event) return res.status(200).send("OK");

    const whatsapp = await Whatsapp.findByPk(whatsappId);

    if (!whatsapp) {
      logger.error(`Whatsapp ${whatsappId} não encontrado`);
      return res.status(404).json({ error: "Whatsapp not found" });
    }

    /* ======================================================
       EVENTO MENSAGEM
    ====================================================== */

    if (payload.event !== "messages.upsert") {
      return res.status(200).send("OK");
    }

    const msg = payload.data;
    const key = msg?.key;

    if (!key?.remoteJid) return res.status(200).send("OK");

    const remoteJid = key.remoteJid;
    const fromMe = key.fromMe;

    if (remoteJid === "status@broadcast") {
      return res.status(200).send("OK");
    }

    const contactNumber = remoteJid.split("@")[0];
    const isGroup = remoteJid.includes("@g.us");

    const messageContent = msg.message || {};
    const msgType = Object.keys(messageContent)[0];

    let body = "";
    let mediaType = "chat";
    let mediaUrl = "";

    /* ======================================================
       TEXTO
    ====================================================== */

    if (messageContent.conversation) {
      body = messageContent.conversation;
    }

    if (messageContent.extendedTextMessage) {
      body = messageContent.extendedTextMessage.text;
    }

    /* ======================================================
       MIDIAS
    ====================================================== */

    if (messageContent.imageMessage) {
      body = messageContent.imageMessage.caption || "Imagem";
      mediaType = "image";
    }

    if (messageContent.videoMessage) {
      body = messageContent.videoMessage.caption || "Vídeo";
      mediaType = "video";
    }

    if (messageContent.audioMessage) {
      body = "Áudio";
      mediaType = "audio";
    }

    if (messageContent.documentMessage) {
      body = messageContent.documentMessage.fileName || "Documento";
      mediaType = "document";
    }

    if (messageContent.stickerMessage) {
      body = "Sticker";
      mediaType = "sticker";
    }

    /* ======================================================
       SALVAR MIDIA
    ====================================================== */

    const base64 = msg?.base64;

    if (base64 && mediaType !== "chat") {
      try {

        const mimeType = messageContent[msgType]?.mimetype || "application/octet-stream";
        const ext = mimeType.split("/")[1] || "bin";

        const fileName = `${Date.now()}-${contactNumber}.${ext}`;
        const publicFolder = path.join(__dirname, "..", "..", "public");

        if (!fs.existsSync(publicFolder)) {
          fs.mkdirSync(publicFolder, { recursive: true });
        }

        const buffer = Buffer.from(base64, "base64");

        fs.writeFileSync(path.join(publicFolder, fileName), buffer);

        mediaUrl = fileName;

      } catch (err) {
        logger.error("Erro salvar mídia", err);
      }
    }

    /* ======================================================
       CONTACT
    ====================================================== */

    const contact = await CreateOrUpdateContactService({
      name: msg.pushName || contactNumber,
      number: contactNumber,
      profilePicUrl: "",
      isGroup,
      companyId: whatsapp.companyId
    });

    /* ======================================================
       SETTINGS
    ====================================================== */

    const settings = await CompaniesSettings.findOne({
      where: { companyId: whatsapp.companyId }
    });

    /* ======================================================
       TICKET
    ====================================================== */

    const ticket = await FindOrCreateTicketService(
      contact,
      whatsapp,
      fromMe ? 0 : 1,
      whatsapp.companyId,
      null,
      null,
      isGroup ? contact : undefined,
      "whatsapp",
      false,
      false,
      settings
    );

    if (!ticket) {
      logger.error("Ticket não criado");
      return res.status(200).send("OK");
    }

    /* ======================================================
       MESSAGE
    ====================================================== */

    await CreateMessageService({
      messageData: {
        wid: key.id,
        ticketId: ticket.id,
        body,
        contactId: contact.id,
        fromMe,
        read: fromMe,
        mediaType,
        mediaUrl,
        ack: 0
      },
      companyId: whatsapp.companyId
    });

    logger.info(`Mensagem salva Ticket ${ticket.id}`);

    return res.status(200).send("OK");

  } catch (error) {
    logger.error("Webhook Evolution erro:", error);
    return res.status(500).json({ error: "Internal error" });
  }
};
