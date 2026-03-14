import * as Yup from "yup";
import { Op } from "sequelize";
import AppError from "../../errors/AppError";
import Whatsapp from "../../models/Whatsapp";
import ShowWhatsAppService from "./ShowWhatsAppService";
import AssociateWhatsappQueue from "./AssociateWhatsappQueue";

interface WhatsappData {
  name?: string;
  status?: string;
  session?: string;
  isDefault?: boolean;
  greetingMessage?: string;
  complationMessage?: string;
  outOfHoursMessage?: string;
  ratingMessage?: string;
  queueIds?: number[];
  token?: string;
  provider?: string;
  channel?: string;
  timeSendQueue?: number;
  sendIdQueue?: number;
  timeUseBotQueues?: string | number;
  maxUseBotQueues?: string | number;
  expiresTicket?: number;
  expiresInactiveMessage?: string;
  timeInactiveMessage?: string;
  inactiveMessage?: string;
  groupAsTicket?: string;
  importOldMessages?: string;
  importRecentMessages?: string;
  closedTicketsPostImported?: boolean;
  importOldMessagesGroups?: boolean;
  timeCreateNewTicket?: number;
  schedules?: any[];
  promptId?: number;
  collectiveVacationEnd?: string;
  collectiveVacationMessage?: string;
  collectiveVacationStart?: string;
  queueIdImportMessages?: number;
  flowIdNotPhrase?: number;
  flowIdWelcome?: number;
  channelType?: string;
  wabaPhoneNumberId?: string;
  wabaAccessToken?: string;
  wabaBusinessAccountId?: string;
  wabaWebhookVerifyToken?: string;
  allowGroup?: boolean;
  maxUseBotQueuesNPS?: number;
  expiresTicketNPS?: number;
  whenExpiresTicket?: string;
  // ---------- EVOLUTION API ----------
  evolutionApiUrl?: string;
  evolutionApiKey?: string;
  evolutionInstanceName?: string;
}

interface Request {
  whatsappData: WhatsappData;
  whatsappId: string;
  companyId: number;
}

interface Response {
  whatsapp: Whatsapp;
  oldDefaultWhatsapp: Whatsapp | null;
}

const UpdateWhatsAppService = async ({
  whatsappData,
  whatsappId,
  companyId
}: Request): Promise<Response> => {
  const schema = Yup.object().shape({
    name: Yup.string().min(2),
    status: Yup.string(),
    isDefault: Yup.boolean()
  });

  const {
    name,
    status,
    isDefault,
    session,
    greetingMessage,
    complationMessage,
    outOfHoursMessage,
    ratingMessage,
    queueIds = [],
    token,
    provider,
    channel,
    timeSendQueue,
    sendIdQueue,
    timeUseBotQueues,
    maxUseBotQueues,
    expiresTicket,
    expiresInactiveMessage,
    timeInactiveMessage,
    inactiveMessage,
    groupAsTicket,
    importOldMessages,
    importRecentMessages,
    closedTicketsPostImported,
    importOldMessagesGroups,
    timeCreateNewTicket,
    schedules,
    promptId,
    collectiveVacationEnd,
    collectiveVacationMessage,
    collectiveVacationStart,
    queueIdImportMessages,
    flowIdNotPhrase,
    flowIdWelcome,
    channelType,
    wabaPhoneNumberId,
    wabaAccessToken,
    wabaBusinessAccountId,
    wabaWebhookVerifyToken,
    allowGroup,
    maxUseBotQueuesNPS,
    expiresTicketNPS,
    whenExpiresTicket,
    // ---------- EVOLUTION API ----------
    evolutionApiUrl,
    evolutionApiKey,
    evolutionInstanceName
  } = whatsappData;

  try {
    await schema.validate({ name, status, isDefault });
  } catch (err: any) {
    throw new AppError(err.message);
  }

  if (queueIds.length > 1 && !greetingMessage) {
    throw new AppError("ERR_WAPP_GREETING_REQUIRED");
  }

  let oldDefaultWhatsapp: Whatsapp | null = null;

  if (isDefault) {
    oldDefaultWhatsapp = await Whatsapp.findOne({
      where: {
        isDefault: true,
        id: { [Op.not]: whatsappId },
        companyId
      }
    });
    if (oldDefaultWhatsapp) {
      await oldDefaultWhatsapp.update({ isDefault: false });
    }
  }

  const whatsapp = await ShowWhatsAppService(whatsappId, companyId);

  // ==========================================
  // CORREÇÃO: Manter o canal da evolution seguro na hora de editar
  // ==========================================
  let finalChannel = channel || whatsapp.channel; // mantem o atual se nao vier
  if (channelType === "evolution" || (evolutionInstanceName && evolutionInstanceName.trim() !== "")) {
    finalChannel = "evolution";
  }
  // ==========================================

  await whatsapp.update({
    name,
    status,
    session,
    greetingMessage,
    complationMessage,
    outOfHoursMessage,
    ratingMessage,
    isDefault,
    companyId,
    token,
    provider,
    channel: finalChannel, // <-- Aplicado
    timeSendQueue,
    sendIdQueue,
    timeUseBotQueues,
    maxUseBotQueues,
    expiresTicket,
    expiresInactiveMessage,
    timeInactiveMessage,
    inactiveMessage,
    groupAsTicket,
    importOldMessages,
    importRecentMessages,
    closedTicketsPostImported,
    importOldMessagesGroups,
    timeCreateNewTicket,
    schedules,
    promptId,
    collectiveVacationEnd,
    collectiveVacationMessage,
    collectiveVacationStart,
    queueIdImportMessages,
    flowIdNotPhrase,
    flowIdWelcome,
    channelType: channelType || finalChannel, // <-- Aplicado
    wabaPhoneNumberId,
    wabaAccessToken,
    wabaBusinessAccountId,
    wabaWebhookVerifyToken,
    allowGroup,
    maxUseBotQueuesNPS,
    expiresTicketNPS,
    whenExpiresTicket,
    // ---------- EVOLUTION API ----------
    evolutionApiUrl,
    evolutionApiKey,
    evolutionInstanceName
  });

  await AssociateWhatsappQueue(whatsapp, queueIds);

  return { whatsapp, oldDefaultWhatsapp };
};

export default UpdateWhatsAppService;
