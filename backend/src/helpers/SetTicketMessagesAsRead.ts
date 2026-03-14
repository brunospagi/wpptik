import { proto } from "@whiskeysockets/baileys";
import cacheLayer from "../libs/cache";
import { getIO } from "../libs/socket";
import Message from "../models/Message";
import Ticket from "../models/Ticket";
import logger from "../utils/logger";
import GetTicketWbot from "./GetTicketWbot";
import ShowWhatsAppService from "../services/WhatsappService/ShowWhatsAppService";

const SetTicketMessagesAsRead = async (ticket: Ticket): Promise<void> => {

  if (!ticket.whatsappId) {
    return;
  }

  const whatsapp = await ShowWhatsAppService(
    ticket.whatsappId,
    ticket.companyId
  );

  if (
    ["open", "group"].includes(ticket.status) &&
    whatsapp &&
    whatsapp.status === "CONNECTED" &&
    ticket.unreadMessages > 0
  ) {

    try {

      const wbot = await GetTicketWbot(ticket);

      const messages = await Message.findAll({
        where: {
          ticketId: ticket.id,
          fromMe: false,
          read: false
        },
        order: [["createdAt", "DESC"]]
      });

      if (messages.length > 0) {

        for (const message of messages) {

          if (!message.dataJson) {
            continue;
          }

          let msg: proto.IWebMessageInfo | null = null;

          try {
            msg = JSON.parse(message.dataJson);
          } catch (err) {
            logger.warn(`Erro ao parsear message.dataJson id=${message.id}`);
            continue;
          }

          if (!msg || !msg.key) {
            continue;
          }

          if (
            msg.key.fromMe === false &&
            !ticket.isBot &&
            (ticket.userId || ticket.isGroup)
          ) {

            try {
              await wbot.readMessages([msg.key]);
            } catch (err) {
              logger.warn(`Erro ao marcar mensagem como lida id=${message.id}`);
            }

          }

        }

      }

      await Message.update(
        { read: true },
        {
          where: {
            ticketId: ticket.id,
            read: false
          }
        }
      );

      await ticket.update({ unreadMessages: 0 });

      await cacheLayer.set(
        `contacts:${ticket.contactId}:unreads`,
        "0"
      );

      const io = getIO();

      io.of(`/workspace-${ticket.companyId}`)
        .emit(`company-${ticket.companyId}-ticket`, {
          action: "updateUnread",
          ticketId: ticket.id
        });

    } catch (err) {

      logger.warn(
        `Could not mark messages as read. Maybe whatsapp session disconnected? Err: ${err}`
      );

    }

  }

};

export default SetTicketMessagesAsRead;
