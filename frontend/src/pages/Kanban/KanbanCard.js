import React, { useEffect, useMemo, useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import { Avatar, Chip, Typography, Tooltip, IconButton, Menu, MenuItem, ListItemText } from "@material-ui/core";
import { Facebook, Instagram, WhatsApp, Close as CloseIcon } from "@material-ui/icons";
import ContactAvatar from "../../components/ContactAvatar";
import { ChatBubbleOutline, AttachFile, EventAvailable } from "@material-ui/icons";
import MoreVertIcon from "@material-ui/icons/MoreVert";
import { i18n } from "../../translate/i18n";
import { format, parseISO } from "date-fns";

const useStyles = makeStyles(theme => ({
  card: {
    background: theme.palette.background.paper,
    borderRadius: 16,
    boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
    padding: theme.spacing(2),
    margin: '8px auto',
    width: '95%',
    maxWidth: 340,
    boxSizing: 'border-box',
    cursor: "pointer",
    transition: "box-shadow 0.2s ease, transform 0.1s ease",
    position: 'relative',
    '&:hover': {
      boxShadow: "0 8px 22px rgba(0,0,0,0.12)",
      transform: "translateY(-1px)",
    }
  },
  closeBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    padding: 4,
  },
  menuBtn: {
    position: 'absolute',
    top: 4,
    left: -4,
    padding: 4,
  },
  priorityDot: {
    position: 'absolute',
    top: 38,
    right: 90, 
    width: 12,
    height: 12,
    borderRadius: 999,
  },
  topRow: {
    display: "flex",
    alignItems: "center",
    marginBottom: theme.spacing(1),
    gap: 8,
  },
  avatarWrap: {
    position: 'relative',
    width: 36,
    height: 36,
  },
  channelBadge: {
    position: 'absolute',
    bottom: -2,
    left: -2,
    width: 16,
    height: 16,
    borderRadius: 999,
    background: theme.palette.background.paper,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 0 1px rgba(0,0,0,0.06)'
  },
  queuePill: {
    padding: '3px 10px',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700,
    lineHeight: '14px',
    display: 'inline-flex',
    alignItems: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  contactInfo: {
    marginLeft: theme.spacing(1),
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
  },
  title: {
    fontWeight: 700,
    lineHeight: 1.2,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  note: {
    color: theme.palette.text.secondary,
    marginTop: 4,
    marginBottom: theme.spacing(1),
  },
  progressWrap: {
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1),
  },
  progressTrack: {
    width: '100%',
    height: 8,
    borderRadius: 6,
    background: theme.palette.action.hover,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressBar: {
    height: '100%',
  },
  bottomRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginTop: theme.spacing(1)
  },
  userWrap: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  userAvatar: {
    width: 24,
    height: 24,
    fontSize: 12,
  },
  counters: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  counterItem: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  },
}));

const getPriorityFromUnread = (unread) => {
  const u = Number(unread) || 0;
  if (u === 0) return { label: "Low", color: "#22c55e" };
  if (u > 5) return { label: "High", color: "#ef4444" };
  return { label: "Medium", color: "#f59e0b" };
};

const getProgress = (unread) => {
  const u = Number(unread) || 0;
  return Math.max(0, 100 - Math.min(u, 10) * 10);
};

export default function KanbanCard({ ticket, onClick, allTags = [], onMoveRequest }) {
  const classes = useStyles();
  const [menuEl, setMenuEl] = useState(null);
  const [moveEl, setMoveEl] = useState(null);
  const [prioritySignal, setPrioritySignal] = useState(0);

  useEffect(() => {
    const handler = () => setPrioritySignal(s => s + 1);
    window.addEventListener('kanban:priorityChanged', handler);
    return () => window.removeEventListener('kanban:priorityChanged', handler);
  }, []);

  const priorityKey = `kanbanPriorityOverrides`;
  const override = useMemo(() => {
    try {
      const raw = localStorage.getItem(priorityKey);
      const map = raw ? JSON.parse(raw) : {};
      return map[String(ticket?.id)];
    } catch (e) { return null; }
  }, [ticket?.id, prioritySignal]);

  const priority = useMemo(() => {
    if (override === 'High') return { label: 'High', color: '#ef4444' };
    if (override === 'Medium') return { label: 'Medium', color: '#f59e0b' };
    if (override === 'Low') return { label: 'Low', color: '#22c55e' };
    return getPriorityFromUnread(ticket?.unreadMessages);
  }, [override, ticket?.unreadMessages]);

  const progress = getProgress(ticket?.unreadMessages);

  const lastInteractionText = useMemo(() => {
    try {
      const raw = ticket?.lastInteractionAt || ticket?.updatedAt || ticket?.lastMessageDate || ticket?.createdAt;
      if (!raw) return null;
      const date = typeof raw === 'string' ? parseISO(raw) : new Date(raw);
      if (!date || isNaN(date)) return null;
      return format(date, "dd/MM/yyyy HH:mm");
    } catch (_) { return null; }
  }, [ticket?.lastInteractionAt, ticket?.updatedAt, ticket?.lastMessageDate, ticket?.createdAt]);

  const channelIcon = useMemo(() => {
    const style = { fontSize: 12 };
    switch (ticket?.channel) {
      case 'facebook': return <Facebook style={{ ...style, color: "#3b5998" }} />;
      case 'instagram': return <Instagram style={{ ...style, color: "#e1306c" }} />;
      case 'whatsapp': return <WhatsApp style={{ ...style, color: "#25d366" }} />;
      default: return null;
    }
  }, [ticket?.channel]);

  const userInitials = ticket?.user?.name
    ? ticket.user.name.split(" ").map(p => p[0]).slice(0, 2).join("")
    : "?";

  const comments = Number(ticket?.unreadMessages) || 0; // mensagens não lidas
  const attachments = Number(ticket?.mediaCount) || 0; // anexos
  const schedules = Number(ticket?.schedulesCount || ticket?.appointmentsCount || 0); // agendamentos

  return (
    <div className={classes.card} onClick={onClick}>
      {/* Botões e indicadores no topo */}
      <IconButton className={classes.menuBtn} size="small" onClick={(e)=>{ e.stopPropagation(); setMenuEl(e.currentTarget); }}>
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <IconButton className={classes.closeBtn} size="small" onClick={(e)=>{ e.stopPropagation(); try { window.dispatchEvent(new CustomEvent('kanban:cardClose', { detail: { id: ticket?.id } })); } catch (err) {} }}>
        <CloseIcon fontSize="small" />
      </IconButton>
      <span className={classes.priorityDot} style={{ background: priority.color }} />
      <div className={classes.topRow}>
        <div className={classes.avatarWrap}>
          <ContactAvatar contact={ticket?.contact} style={{ width: 36, height: 36 }} />
          <div className={classes.channelBadge}>
            {channelIcon}
          </div>
        </div>
        <div className={classes.contactInfo}>
          <Tooltip title={ticket?.contact?.name || ticket?.contact?.number || "Contato"}>
            <Typography variant="subtitle1" className={classes.title}>
              {ticket?.contact?.name || ticket?.contact?.number || "Contato"}
            </Typography>
          </Tooltip>
          <Typography variant="caption" color="textSecondary">
            Ticket #{ticket?.id}
          </Typography>
        </div>
        {/* espaço flex */}
        <div style={{ marginLeft: 'auto' }} />
      </div>

      {/* Menus (fixos no topo/esquerda) */}
      <Menu anchorEl={menuEl} open={Boolean(menuEl)} onClose={()=>setMenuEl(null)} getContentAnchorEl={null} anchorOrigin={{vertical:'bottom', horizontal:'left'}} transformOrigin={{vertical:'top', horizontal:'left'}} onClick={(e)=>e.stopPropagation()}>
        <MenuItem onClick={async ()=>{ try { await navigator.clipboard.writeText(`${window.location.origin}/tickets/${ticket?.uuid}`); } catch(e){} setMenuEl(null); }}>
          <ListItemText primary={i18n.t('kanban.copyTicketLink')} />
        </MenuItem>
        <MenuItem onClick={(e)=>{ setMoveEl(e.currentTarget); }}>
          <ListItemText primary={i18n.t('kanban.moveToTag')} />
        </MenuItem>
        <MenuItem onClick={()=>{
          try {
            const raw = localStorage.getItem(priorityKey);
            const map = raw ? JSON.parse(raw) : {};
            const order = ['Low','Medium','High'];
            const current = map[String(ticket?.id)] || null;
            const next = current ? order[(order.indexOf(current)+1)%order.length] : 'High';
            map[String(ticket?.id)] = next;
            localStorage.setItem(priorityKey, JSON.stringify(map));
            setPrioritySignal(s => s + 1);
            try { window.dispatchEvent(new CustomEvent('kanban:priorityChanged')); } catch (_) {}
          } catch(e) {}
          setMenuEl(null);
        }}>
          <ListItemText primary={i18n.t('kanban.togglePriority')} />
        </MenuItem>
      </Menu>
      <Menu anchorEl={moveEl} open={Boolean(moveEl)} onClose={()=>setMoveEl(null)} getContentAnchorEl={null} anchorOrigin={{vertical:'bottom', horizontal:'left'}} transformOrigin={{vertical:'top', horizontal:'left'}} onClick={(e)=>e.stopPropagation()}>
        {allTags && allTags.length ? allTags.map(t=> (
          <MenuItem key={t.id} onClick={()=>{ setMoveEl(null); setMenuEl(null); onMoveRequest && onMoveRequest(String(t.id)); }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: t.color, display: 'inline-block', marginRight: 8 }} />
            <ListItemText primary={t.name} />
          </MenuItem>
        )) : (
          <MenuItem disabled>
            <ListItemText primary={i18n.t('kanban.noTagsAvailable')} />
          </MenuItem>
        )}
      </Menu>

      {ticket?.lastMessage && (
        <Typography variant="body2" className={classes.note}>
          {ticket.lastMessage}
        </Typography>
      )}

      <div className={classes.progressWrap}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="caption" color="textSecondary">{i18n.t('kanban.progress')}</Typography>
          {lastInteractionText && (
            <Tooltip title={'Última interação'}>
              <Typography variant="caption" color="textSecondary">{lastInteractionText}</Typography>
            </Tooltip>
          )}
        </div>
        <div className={classes.progressTrack}>
          <div className={classes.progressBar} style={{ width: `${progress}%`, background: priority.color }} />
        </div>
      </div>

      <div className={classes.bottomRow}>
        <div className={classes.userWrap}>
          <Avatar className={classes.userAvatar}>{userInitials}</Avatar>
          <Typography variant="caption" color="textSecondary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {ticket?.user?.name || i18n.t('kanban.noAssignee')} |
            <span className={classes.queuePill} style={{ background: (ticket?.queue?.color || '#9CA3AF'), color: '#fff' }}>
              {ticket?.queue?.name || ticket?.whatsapp?.name || 'Fila'}
            </span>
          </Typography>
        </div>
      </div>
      <div className={classes.bottomRow}>
        <div className={classes.counters}>
          <Tooltip title={i18n.t('kanban.counters.comments')}>
            <div className={classes.counterItem}>
              <ChatBubbleOutline style={{ fontSize: 16 }} />
              <span>{comments}</span>
            </div>
          </Tooltip>
          <Tooltip title={i18n.t('kanban.counters.attachments')}>
            <div className={classes.counterItem}>
              <AttachFile style={{ fontSize: 16 }} />
              <span>{attachments}</span>
            </div>
          </Tooltip>
          <Tooltip title={i18n.t('kanban.counters.subtasks')}>
            <div className={classes.counterItem}>
              <EventAvailable style={{ fontSize: 16 }} />
              <span>{schedules}</span>
            </div>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}

// listen globally to priority change to update this card immediately
// placed after component for clarity; could be inside but we need hooks, so using inside component:
