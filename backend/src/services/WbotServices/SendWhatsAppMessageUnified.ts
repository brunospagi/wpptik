import * as Sentry from "@sentry/node";
import { proto } from "@whiskeysockets/baileys";

import AppError from "../../errors/AppError";
import { GetTicketAdapter } from "../../helpers/GetWhatsAppAdapter";

import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";

import formatBody from "../../helpers/Mustache";
import RefreshContactAvatarService from "../ContactServices/RefreshContactAvatarService";

import logger from "../../utils/logger";
import { IWhatsAppMessage } from "../../libs/whatsapp";

interface TemplateButton {
  index: number;
  urlButton?: {
    displayText: string;
    url: string;
  };
  callButton?: {
    displayText: string;
    phoneNumber: string;
  };
  quickReplyButton?: {
    displayText: string;
    id: string;
  };
}

interface Request {
  body?: string;
  ticket: Ticket;
  quotedMsg?: Message;
  msdelay?: number;
  vCard?: Contact;
  isForwarded?: boolean;
  templateButtons?: TemplateButton[];
  messageTitle?: string;
  imageUrl?: string;
}

const SendWhatsAppMessageUnified = async ({
  body,
  ticket,
  quotedMsg,
  msdelay = 0,
  vCard,
  isForwarded = false,
  templateButtons,
  messageTitle,
  imageUrl
}: Request): Promise<IWhatsAppMessage | proto.WebMessageInfo> => {

  try {

    logger.info(
      `[SendUnified] Enviando mensagem para ticket ${ticket.id} (whatsappId=${ticket.whatsappId})`
    );

    // =========================
    // VALIDAÇÃO DE CONTEÚDO
    // =========================
    if (!body && !vCard && !templateButtons && !imageUrl) {
      logger.warn(
        `[SendUnified] Nenhum conteúdo fornecido. ticket=${ticket.id}`
      );
      throw new AppError("ERR_NO_MESSAGE_CONTENT_PROVIDED");
    }

    // =========================
    // OBTÉM ADAPTER
    // =========================
    const adapter = await GetTicketAdapter(ticket);
    const channelType = adapter.channelType;

    logger.debug(`[SendUnified] Adapter usado: ${channelType}`);

    // =========================
    // BUSCAR CONTATO
    // =========================
    const contact = await Contact.findByPk(ticket.contactId);

    if (!contact) {
      throw new AppError("ERR_CONTACT_NOT_FOUND", 404);
    }

    // =========================
    // DEFINIR DESTINO
    // =========================
    let number: string;

    if (
      contact.remoteJid &&
      contact.remoteJid !== "" &&
      contact.remoteJid.includes("@")
    ) {
      number = contact.remoteJid;
    } else {
      number = `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`;
    }

    // =========================
    // ATUALIZA AVATAR (BAILEYS)
    // =========================
    if (!ticket.isGroup && channelType === "baileys") {

      const currentName = (contact.name || "").trim();

      const isNumberName =
        currentName === "" ||
        currentName.replace(/\D/g, "") === String(contact.number);

      if (isNumberName) {
        try {

          await RefreshContactAvatarService({
            contactId: ticket.contactId,
            companyId: ticket.companyId,
            whatsappId: ticket.whatsappId
          });

        } catch (err) {
          logger.warn("[SendUnified] Falha ao atualizar avatar");
        }
      }
    }

    // =========================
    // DELAY OPCIONAL
    // =========================
    if (msdelay > 0) {
      await new Promise(resolve => setTimeout(resolve, msdelay));
    }

    let sentMessage: IWhatsAppMessage;

    // =========================
    // ENVIO VCARD
    // =========================
    if (vCard) {

      const numberContact = vCard.number;

      const firstName = vCard.name.split(" ")[0];
      const lastName = String(vCard.name).replace(firstName, "");

      const vcardContent =
        `BEGIN:VCARD\n` +
        `VERSION:3.0\n` +
        `N:${lastName};${firstName};;;\n` +
        `FN:${vCard.name}\n` +
        `TEL;type=CELL;waid=${numberContact}:+${numberContact}\n` +
        `END:VCARD`;

      sentMessage = await adapter.sendMessage({
        to: number.split("@")[0],
        vcard: vcardContent
      });

      await ticket.update({
        lastMessage: formatBody(vcardContent, ticket),
        imported: null
      });

      return sentMessage;
    }

    // =========================
    // ENVIO COM BOTÕES
    // =========================
    if (templateButtons && templateButtons.length > 0) {

      const formattedBody = formatBody(body || "", ticket);

      const buttons = templateButtons
        .filter(btn => btn.quickReplyButton)
        .map(btn => ({
          id: btn.quickReplyButton!.id,
          title: btn.quickReplyButton!.displayText
        }));

      if (imageUrl) {

        sentMessage = await adapter.sendMessage({
          to: number.split("@")[0],
          body: formattedBody,
          mediaUrl: imageUrl,
          mediaType: "image",
          caption: formattedBody,
          buttons: buttons.length > 0 ? buttons : undefined
        });

      } else {

        sentMessage = await adapter.sendMessage({
          to: number.split("@")[0],
          body: formattedBody,
          buttons: buttons.length > 0 ? buttons : undefined
        });

      }

      await ticket.update({
        lastMessage: formattedBody,
        imported: null
      });

      return sentMessage;
    }

    // =========================
    // ENVIO TEXTO
    // =========================
    if (body && body.trim() !== "") {

      const formattedBody = formatBody(body, ticket);

      let quotedMsgId: string | undefined;

      if (quotedMsg) {
        quotedMsgId = quotedMsg.wid || String(quotedMsg.id);
      }

      sentMessage = await adapter.sendMessage({
        to: number.split("@")[0],
        body: formattedBody,
        quotedMsgId
      });

      await ticket.update({
        lastMessage: formattedBody,
        imported: null
      });

      return sentMessage;
    }

    logger.warn(`[SendUnified] Nenhum conteúdo válido após validação`);

    throw new AppError("ERR_NO_MESSAGE_CONTENT_PROVIDED");

  } catch (error: any) {

    Sentry.captureException(error);

    logger.error(
      `[SendUnified] Erro ao enviar mensagem: ${error.message}`
    );

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      error.message || "ERR_SENDING_WAPP_MSG",
      error.statusCode || 500
    );
  }
};

export default SendWhatsAppMessageUnified;
