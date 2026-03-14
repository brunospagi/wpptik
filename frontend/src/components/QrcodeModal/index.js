import React, { useEffect, useState, useContext } from "react";
import QRCode from "qrcode.react";
import toastError from "../../errors/toastError";
import { makeStyles } from "@material-ui/core/styles";
import { Dialog, DialogContent, Paper, Typography } from "@material-ui/core";
import { i18n } from "../../translate/i18n";
import api from "../../services/api";

import { AuthContext } from "../../context/Auth/AuthContext";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center"
  },
}))

const QrcodeModal = ({ open, onClose, whatsAppId }) => {
  const classes = useStyles();
  const [qrCode, setQrCode] = useState("");
  const { user, socket } = useContext(AuthContext);

  useEffect(() => {
    const fetchSession = async () => {
      if (!whatsAppId) return;

      try {
        const { data } = await api.get(`/whatsapp/${whatsAppId}`);
        setQrCode(data.qrcode);
      } catch (err) {
        toastError(err);
      }
    };
    fetchSession();
  }, [whatsAppId]);

  useEffect(() => {
    if (!whatsAppId) return;
    const companyId = user.companyId;

    const onWhatsappData = (data) => {
      if (data.action === "update" && data.session.id === whatsAppId) {
        setQrCode(data.session.qrcode);
      }

      if (data.action === "update" && data.session.qrcode === "") {
        onClose();
      }
    }
    socket.on(`company-${companyId}-whatsappSession`, onWhatsappData);

    return () => {
      socket.off(`company-${companyId}-whatsappSession`, onWhatsappData);
    };
  }, [whatsAppId, onClose, socket, user]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" scroll="paper">
      <DialogContent>
        <Paper elevation={0}>
          <Typography color="secondary" gutterBottom align="center">
            {i18n.t("qrCode.message")}
          </Typography>
          <div className={classes.root}>
            {qrCode ? (
              /* Lógica para diferenciar Baileys vs Evolution:
                Se tiver mais de 500 caracteres ou incluir 'base64', 
                é uma imagem da Evolution. Se não, é texto do Baileys.
              */
              qrCode.includes("base64") || qrCode.length > 500 ? (
                <img 
                  src={qrCode.startsWith("data:image") ? qrCode : `data:image/png;base64,${qrCode}`} 
                  alt="QR Code Evolution" 
                  style={{ width: 300, height: 300, backgroundColor: "white", padding: '5px' }} 
                />
              ) : (
                <QRCode 
                  value={qrCode} 
                  size={300} 
                  style={{ backgroundColor: "white", padding: '5px' }} 
                />
              )
            ) : (
              <span>Aguardando pelo QR Code...</span>
            )}
          </div>
        </Paper>
      </DialogContent>
    </Dialog>
  );
};

export default React.memo(QrcodeModal);