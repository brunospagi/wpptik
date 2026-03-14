import { WASocket } from "@whiskeysockets/baileys";
import { getWbot } from "../libs/wbot";
import GetDefaultWhatsApp from "./GetDefaultWhatsApp";
import Ticket from "../models/Ticket";
import Whatsapp from "../models/Whatsapp";

type Session = WASocket & {
  id?: number;
};

const GetTicketWbot = async (ticket: Ticket): Promise<any> => {

  if (!ticket.whatsappId) {
    const defaultWhatsapp = await GetDefaultWhatsApp(ticket.whatsappId, ticket.companyId);
    await ticket.$set("whatsapp", defaultWhatsapp);
  }

  const whatsapp = await Whatsapp.findByPk(ticket.whatsappId);

  // ===== EVOLUTION =====
  if (whatsapp?.channelType === "evolution") {
    return null; // Evolution não usa socket
  }

  // ===== BAILEYS =====
  const wbot = getWbot(ticket.whatsappId);

  return wbot;
};

export default GetTicketWbot;
