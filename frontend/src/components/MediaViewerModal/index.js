import React from 'react';
import { Modal, makeStyles, Backdrop, Fade, IconButton, Typography } from '@material-ui/core';
import CloseIcon from '@material-ui/icons/Close';
import GetAppIcon from '@material-ui/icons/GetApp';

const useStyles = makeStyles((theme) => ({
  modal: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paper: {
    backgroundColor: theme.palette.background.paper,
    boxShadow: theme.shadows[5],
    padding: 0,
    outline: 'none',
    maxWidth: '95vw',
    maxHeight: '95vh',
    overflow: 'hidden',
    borderRadius: '8px',
    position: 'relative',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing(1, 2),
    borderBottom: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.grey[50],
  },
  content: {
    padding: theme.spacing(2),
    maxHeight: 'calc(95vh - 64px)',
    overflow: 'auto',
  },
  pdfViewer: {
    width: '100%',
    height: '80vh',
    border: 'none',
  },
  media: {
    maxWidth: '100%',
    maxHeight: '80vh',
    objectFit: 'contain',
  },
}));

const MediaViewerModal = ({ open, onClose, url, mediaType, name }) => {
  const classes = useStyles();

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = url;
    link.download = name || 'arquivo';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderMedia = () => {
    if (!url) return null;

    if (mediaType?.startsWith('image/')) {
      return <img src={url} alt={name} className={classes.media} />;
    }
    if (mediaType?.startsWith('audio/')) {
      return <audio src={url} controls autoPlay className={classes.media} style={{ width: '100%' }} />;
    }
    if (mediaType?.startsWith('video/')) {
      return <video src={url} controls autoPlay className={classes.media} />;
    }
    if (mediaType === 'application/pdf') {
      return (
        <iframe
          src={url}
          className={classes.pdfViewer}
          title={name}
        />
      );
    }
    if (mediaType === 'text/plain') {
      return (
        <iframe
          src={url}
          className={classes.pdfViewer}
          title={name}
          style={{ backgroundColor: 'white' }}
        />
      );
    }
    // Outros tipos: mostra informações do arquivo
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <Typography variant="h6" gutterBottom>{name}</Typography>
        <Typography variant="body2" color="textSecondary" gutterBottom>
          Tipo: {mediaType}
        </Typography>
        <Typography variant="body2" style={{ marginTop: '20px' }}>
          Este tipo de arquivo não pode ser visualizado no navegador.
          Use o botão de download para baixar o arquivo.
        </Typography>
      </div>
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      className={classes.modal}
      closeAfterTransition
      BackdropComponent={Backdrop}
      BackdropProps={{
        timeout: 500,
      }}
    >
      <Fade in={open}>
        <div className={classes.paper}>
          <div className={classes.header}>
            <Typography variant="h6" noWrap style={{ flex: 1 }}>
              {name || 'Arquivo'}
            </Typography>
            <div>
              <IconButton onClick={handleDownload} size="small" title="Baixar arquivo">
                <GetAppIcon />
              </IconButton>
              <IconButton onClick={onClose} size="small" title="Fechar">
                <CloseIcon />
              </IconButton>
            </div>
          </div>
          <div className={classes.content}>
            {renderMedia()}
          </div>
        </div>
      </Fade>
    </Modal>
  );
};

export default MediaViewerModal;
