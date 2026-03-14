import { getIO } from "../../libs/socket";
import Contact from "../../models/Contact";
import CompaniesSettings from "../../models/CompaniesSettings";
import logger from "../../utils/logger";
import { safeNormalizePhoneNumber } from "../../utils/phone";
import * as Sentry from "@sentry/node";

interface Request {
  name?: string;
  number: string;
  isGroup: boolean;
  email?: string;
  profilePicUrl?: string;
  companyId: number;
  channel?: string;
  remoteJid?: string;
  whatsappId?: number;
  wbot?: any;
}

const CreateOrUpdateContactService = async ({
  name,
  number,
  isGroup,
  email,
  profilePicUrl,
  companyId,
  channel = "whatsapp",
  remoteJid,
  whatsappId,
  wbot
}: Request): Promise<Contact | null> => {

  try {

    /**
     * =========================
     * PROTEÇÃO DE NÚMERO
     * =========================
     */

    if (!number) {
      logger.warn("Número vazio recebido");
      return null;
    }

    let rawNumber = number.toString().trim();

    /**
     * =========================
     * PROTEÇÃO EVOLUTION
     * =========================
     */

    if (channel === "evolution") {

      if (!name) {
        name = rawNumber;
      }

      if (!remoteJid) {
        remoteJid = isGroup
          ? `${rawNumber}@g.us`
          : `${rawNumber}@s.whatsapp.net`;
      }
    }

    /**
     * =========================
     * NORMALIZAÇÃO TELEFONE
     * =========================
     */

    let canonical: string | null = null;

    if (!isGroup) {

      const normalizedPhone = safeNormalizePhoneNumber(rawNumber);

      if (!normalizedPhone) {

        if (channel === "evolution") {
          logger.warn("Número inválido vindo do Evolution", rawNumber);
          return null;
        }

        throw new Error("Invalid phone number");
      }

      canonical = normalizedPhone.canonical;
    }

    const finalNumber = isGroup ? rawNumber : canonical;

    if (!finalNumber) {
      return null;
    }

    /**
     * ====================================
     * BUSCA CONTATO POR canonicalNumber
     * (evita duplicação)
     * ====================================
     */

    let contact = await Contact.findOne({
      where: {
        companyId,
        canonicalNumber: finalNumber
      }
    });

    /**
     * ====================================
     * FALLBACK ANTIGO (sistemas antigos)
     * ====================================
     */

    if (!contact) {
      contact = await Contact.findOne({
        where: {
          companyId,
          number: finalNumber
        }
      });
    }

    /**
     * ====================================
     * CONTATO EXISTENTE
     * ====================================
     */

    if (contact) {

      const oldName = contact.name;

      const incomingName = name?.trim();

      /**
       * Proteção para não sobrescrever nome manual
       */

      if (!contact.name || contact.name === contact.number) {
        if (incomingName && incomingName !== finalNumber) {
          contact.name = incomingName;
        }
      }

      /**
       * Atualizações básicas
       */

      contact.remoteJid = remoteJid;
      contact.profilePicUrl = profilePicUrl || contact.profilePicUrl;

      /**
       * Garante canonicalNumber
       */

      if (!contact.canonicalNumber && !isGroup) {
        contact.canonicalNumber = finalNumber;
      }

      await contact.save();

      /**
       * Websocket update
       */

      if (oldName !== contact.name) {

        const io = getIO();

        io.of(`/workspace-${companyId}`)
          .emit(`company-${companyId}-contact`, {
            action: "update",
            contact
          });
      }

      return contact;
    }

    /**
     * ====================================
     * CRIAÇÃO DO CONTATO
     * ====================================
     */

    let newRemoteJid = remoteJid;

    if (!newRemoteJid) {
      newRemoteJid = isGroup
        ? `${rawNumber}@g.us`
        : `${rawNumber}@s.whatsapp.net`;
    }

    /**
     * BUSCA FOTO PERFIL
     */

    if (wbot && !profilePicUrl) {

      try {

        profilePicUrl = await wbot.profilePictureUrl(newRemoteJid, "image");

      } catch (err) {

        logger.warn("Erro ao buscar foto perfil", err);

        Sentry.captureException(err);

        profilePicUrl = `${process.env.FRONTEND_URL}/nopicture.png`;
      }
    }

    if (!profilePicUrl) {
      profilePicUrl = `${process.env.FRONTEND_URL}/nopicture.png`;
    }

    /**
     * CONFIG EMPRESA
     */

    const settings = await CompaniesSettings.findOne({
      where: { companyId }
    });

    const acceptAudio =
      settings?.acceptAudioMessageContact === "enabled";

    /**
     * NOME FINAL
     */

    const contactName =
      name && name.trim() !== finalNumber
        ? name.trim()
        : finalNumber;

    /**
     * CRIA CONTATO
     */

    contact = await Contact.create({
      name: contactName,
      number: finalNumber,
      canonicalNumber: isGroup ? null : finalNumber,
      email: email || "",
      profilePicUrl,
      isGroup,
      companyId,
      channel,
      remoteJid: newRemoteJid,
      whatsappId,
      acceptAudioMessage: acceptAudio
    });

    /**
     * SOCKET CREATE
     */

    const io = getIO();

    io.of(`/workspace-${companyId}`)
      .emit(`company-${companyId}-contact`, {
        action: "create",
        contact
      });

    return contact;

  } catch (err: any) {

    logger.error("Error to find or create a contact", {
      message: err?.message,
      stack: err?.stack
    });

    Sentry.captureException(err);

    return null;
  }
};

export default CreateOrUpdateContactService;
