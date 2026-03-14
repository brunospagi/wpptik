interface Params {
  name?: string;
  number: string;
  remoteJid?: string;
}

export const normalizeBaileysContact = ({
  name,
  number,
  remoteJid
}: Params) => {

  const rawNumber = number.toString().trim();

  return {
    name: name || rawNumber,
    number: rawNumber,
    remoteJid
  };

};
