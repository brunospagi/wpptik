import React, { useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import { Typography, IconButton, Tooltip, Chip, Menu, MenuItem, ListItemText } from "@material-ui/core";
import MoreHorizIcon from "@material-ui/icons/MoreHoriz";
import { i18n } from "../../translate/i18n";

const useStyles = makeStyles(theme => ({
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: theme.spacing(1.5, 1.5, 0.5),
  },
  left: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    background: theme.palette.primary.main,
  },
  count: {
    marginLeft: theme.spacing(1),
    fontWeight: 600,
  }
}));

export default function KanbanLaneHeader(props) {
  const { title, label, unreadCount } = props;
  const color = props.color || props.laneColor;
  const classes = useStyles();
  const [anchorEl, setAnchorEl] = useState(null);

  const handleOpen = (e) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);
  const handleHide = () => {
    try {
      const id = props?.id;
      const key = 'kanbanHiddenLanes';
      const raw = localStorage.getItem(key);
      const arr = raw ? JSON.parse(raw) : [];
      if (id && !arr.includes(id)) {
        arr.push(id);
        localStorage.setItem(key, JSON.stringify(arr));
        // Opcional: notificar quem estiver escutando
        window.dispatchEvent(new CustomEvent('kanban:lanesHiddenChanged'));
      }
    } catch (e) {}
    handleClose();
  };
  const handleManage = () => {
    handleClose();
    try {
      window.location.assign('/tagsKanban');
    } catch (e) {}
  };
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch (e) {}
    handleClose();
  };
  return (
    <div className={classes.header}>
      <div className={classes.left}>
        <span className={classes.dot} style={{ background: color || "#999" }} />
        <Typography variant="subtitle2" style={{ fontWeight: 800 }}>{title}</Typography>
        <Chip size="small" label={label} variant="default" />
        {typeof unreadCount === 'number' && unreadCount > 0 && (
          <Chip size="small" color="secondary" label={`${unreadCount} ${i18n.t('kanban.unread')}`} style={{ marginLeft: 6 }} />
        )}
      </div>
      <Tooltip title={i18n.t('kanban.options')}>
        <IconButton size="small" onClick={handleOpen}>
          <MoreHorizIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose} getContentAnchorEl={null} anchorOrigin={{vertical:'bottom', horizontal:'right'}} transformOrigin={{vertical:'top', horizontal:'right'}}>
        <MenuItem onClick={handleHide}><ListItemText primary={i18n.t('kanban.hideColumn')} /></MenuItem>
        <MenuItem onClick={handleManage}><ListItemText primary={i18n.t('kanban.manageColumns')} /></MenuItem>
        <MenuItem onClick={handleCopyLink}><ListItemText primary={i18n.t('kanban.copyLink')} /></MenuItem>
      </Menu>
    </div>
  );
}
