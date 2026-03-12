import React from 'react';
import { makeStyles } from "@material-ui/core/styles";
import DescriptionIcon from '@material-ui/icons/Description';
import { Box, Typography, Tooltip } from '@material-ui/core';

const useStyles = makeStyles((theme) => ({
  mediaContainer: {
    width: '100px',
    height: '100px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.palette.grey[200],
    borderRadius: '8px',
    cursor: 'pointer',
    position: 'relative',
    border: `2px solid ${theme.palette.grey[300]}`,
    transition: 'all 0.2s ease',
    '&:hover': {
      borderColor: theme.palette.primary.main,
      transform: 'scale(1.02)',
    },
  },
  previewWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  fileInfo: {
    textAlign: 'center',
    maxWidth: '100px',
  },
  fileName: {
    fontSize: '0.75rem',
    fontWeight: 500,
    color: theme.palette.text.primary,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    marginBottom: '2px',
  },
  fileDetails: {
    fontSize: '0.65rem',
    color: theme.palette.text.secondary,
    lineHeight: 1.2,
  },
  media: {
    maxWidth: '100%',
    maxHeight: '100%',
    width: 'auto',
    height: 'auto',
    objectFit: 'cover',
  },
  icon: {
    fontSize: '2.5rem',
    color: theme.palette.grey[600],
  },
}));

const MediaPreview = ({ url, mediaType, name, onClick, fileSize, createdAt }) => {
  const classes = useStyles();

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFileExtension = (filename, mimeType) => {
    if (filename && filename.includes('.')) {
      return filename.split('.').pop().toUpperCase();
    }
    if (mimeType) {
      const typeMap = {
        'image/jpeg': 'JPG',
        'image/png': 'PNG',
        'image/gif': 'GIF',
        'image/webp': 'WEBP',
        'application/pdf': 'PDF',
        'text/plain': 'TXT',
        'audio/mpeg': 'MP3',
        'audio/wav': 'WAV',
        'video/mp4': 'MP4',
        'video/webm': 'WEBM'
      };
      return typeMap[mimeType] || mimeType.split('/')[1].toUpperCase();
    }
    return '';
  };

  const renderContent = () => {
    if (!url) {
      return (
        <div style={{ textAlign: 'center', padding: '8px' }}>
          <DescriptionIcon className={classes.icon} style={{ fontSize: '2rem', color: '#ccc' }} />
          <Typography variant="caption" style={{ fontSize: '0.7rem', color: '#999' }}>
            Sem arquivo
          </Typography>
        </div>
      );
    }

    if (mediaType?.startsWith('image/')) {
      return <img src={url} alt={name} className={classes.media} />;
    }

    if (mediaType?.startsWith('audio/')) {
      return (
        <div style={{ textAlign: 'center', padding: '8px' }}>
          <DescriptionIcon className={classes.icon} style={{ color: '#4CAF50' }} />
          <Typography variant="caption" style={{ fontSize: '0.7rem' }}>
            ÁUDIO
          </Typography>
        </div>
      );
    }

    if (mediaType?.startsWith('video/')) {
      return (
        <div style={{ textAlign: 'center', padding: '8px' }}>
          <DescriptionIcon className={classes.icon} style={{ color: '#2196F3' }} />
          <Typography variant="caption" style={{ fontSize: '0.7rem' }}>
            VÍDEO
          </Typography>
        </div>
      );
    }

    if (mediaType === 'application/pdf') {
      return (
        <div style={{ textAlign: 'center', padding: '8px' }}>
          <DescriptionIcon className={classes.icon} style={{ color: '#F44336' }} />
          <Typography variant="caption" style={{ fontSize: '0.7rem' }}>
            PDF
          </Typography>
        </div>
      );
    }

    // Ícone genérico para outros tipos
    return (
      <div style={{ textAlign: 'center', padding: '8px' }}>
        <DescriptionIcon className={classes.icon} />
        <Typography variant="caption" style={{ fontSize: '0.7rem' }}>
          {getFileExtension(name, mediaType)}
        </Typography>
      </div>
    );
  };

  const tooltipContent = (
    <div>
      <div><strong>Nome:</strong> {name || 'Sem nome'}</div>
      <div><strong>Tipo:</strong> {getFileExtension(name, mediaType)} ({mediaType || 'Desconhecido'})</div>
      {fileSize && <div><strong>Tamanho:</strong> {formatFileSize(fileSize)}</div>}
      {createdAt && <div><strong>Data:</strong> {formatDate(createdAt)}</div>}
      <div style={{ marginTop: '8px', fontSize: '0.8em', opacity: 0.8 }}>
        Clique para visualizar
      </div>
    </div>
  );

  return (
    <div className={classes.previewWrapper}>
      <Tooltip title={tooltipContent} arrow placement="top">
        <Box className={classes.mediaContainer} onClick={onClick}>
          {renderContent()}
        </Box>
      </Tooltip>
      <div className={classes.fileInfo}>
        <div className={classes.fileName}>
          {name || 'Sem nome'}
        </div>
        <div className={classes.fileDetails}>
          {getFileExtension(name, mediaType)}
          {fileSize && ` • ${formatFileSize(fileSize)}`}
          {createdAt && (
            <>
              <br />
              {formatDate(createdAt)}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MediaPreview;
