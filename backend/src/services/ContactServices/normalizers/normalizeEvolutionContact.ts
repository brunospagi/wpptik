import logger from "../../../utils/logger";

interface Params {
  name?: string;
  number?: string;
  remoteJid?: string;
  isGroup?: boolean;
}

export const normalizeEvolutionContact = ({
  name,
  number,
  remoteJid,
  isGroup
}: Params) => {

  try {

    const rawNumber = (number || "").toString().trim();

    if (!rawNumber) {
      logger.warn("Evolution enviou número vazio");
      return null;
    }

    let finalRemoteJid = remoteJid;

    if (!finalRemoteJid) {
      finalRemoteJid = isGroup
        ? `${rawNumber}@g.us`
        : `${rawNumber}@s.whatsapp.net`;
    }

    return {
      name: name || rawNumber,
      number: rawNumber,
      remoteJid: finalRemoteJid
    };

  } catch (err) {

    logger.error("Erro ao normalizar contato Evolution", err);

    return null;
  }
};
