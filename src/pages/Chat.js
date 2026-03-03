import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMessages, sendMessage, deleteMessage, getUser, markChatRead } from '../utils/storage';
import { subscribeToMessages, unsubscribe } from '../utils/realtime';
import {
  Box, AppBar, Toolbar, Typography, Avatar, IconButton,
  TextField, CircularProgress, Dialog, Button,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SendIcon from '@mui/icons-material/Send';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

export default function Chat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [partner, setPartner] = useState(null);
  const messagesEndRef = useRef(null);
  const channelRef = useRef(null);
  const [selectedMsg, setSelectedMsg] = useState(null);
  const longPressRef = useRef(null);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    if (!user.partner_id) { navigate('/home'); return; }

    getUser(user.partner_id).then(setPartner);
    markChatRead(user.id);
    getMessages(user.id, user.partner_id).then(msgs => {
      setMessages(msgs);
      setLoading(false);
    });

    channelRef.current = subscribeToMessages(
      user.id,
      user.partner_id,
      (newMsg) => {
        if (newMsg.sender_id !== user.id) {
          setMessages(prev => [...prev, newMsg]);
        }
      }
    );

    return () => {
      markChatRead(user.id);
      unsubscribe(channelRef.current);
    };
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    const t = text.trim();
    setText('');
    setSending(true);
    const msg = await sendMessage(user.id, user.partner_id, t);
    if (msg) setMessages(prev => [...prev, msg]);
    setSending(false);
  };

  const handleDelete = async () => {
    if (!selectedMsg) return;
    const ok = await deleteMessage(selectedMsg.id);
    if (ok) setMessages(prev => prev.filter(m => m.id !== selectedMsg.id));
    setSelectedMsg(null);
  };

  const startLongPress = (msg) => {
    if (msg.sender_id !== user.id) return;
    longPressRef.current = setTimeout(() => setSelectedMsg(msg), 500);
  };

  const cancelLongPress = () => {
    clearTimeout(longPressRef.current);
  };

  if (!user) return null;

  const formatTime = (ts) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (ts) => {
    const d = new Date(ts);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return 'Сегодня';
    if (d.toDateString() === yesterday.toDateString()) return 'Вчера';
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  };

  let lastDate = null;

  return (
    <Box sx={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: '#050505' }}>
      <AppBar position="static" elevation={0} sx={{
        background: 'rgba(5,5,5,0.85)', backdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(255,255,255,0.03)', flexShrink: 0,
      }}>
        <Toolbar sx={{ justifyContent: 'space-between', minHeight: '56px !important', px: { xs: 2, sm: 3 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton onClick={() => navigate('/home')} sx={{ color: '#888', '&:hover': { color: '#fff' } }}>
              <ArrowBackIcon fontSize="small" />
            </IconButton>
            {partner && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar
                  src={partner.avatar_url || undefined}
                  sx={{
                    width: 30, height: 30,
                    bgcolor: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: '#ccc', fontSize: '0.75rem',
                  }}
                >
                  {(partner.display_name || partner.username)?.charAt(0).toUpperCase()}
                </Avatar>
                <Typography sx={{ fontSize: '0.9rem', fontWeight: 300, color: '#fff' }}>
                  {partner.display_name || partner.username}
                </Typography>
              </Box>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      <Box sx={{ flex: 1, overflowY: 'auto', px: { xs: 2, sm: 3 }, py: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress size={28} sx={{ color: 'rgba(255,255,255,0.3)' }} />
          </Box>
        ) : messages.length === 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Typography sx={{ color: '#333', fontSize: '0.85rem' }}>
              Начните общение
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, maxWidth: 600, mx: 'auto' }}>
            {messages.map((msg, i) => {
              const isMine = msg.sender_id === user.id;
              const msgDate = formatDate(msg.created_at);
              let showDate = false;
              if (msgDate !== lastDate) { showDate = true; lastDate = msgDate; }

              return (
                <Box key={msg.id || i}>
                  {showDate && (
                    <Typography sx={{
                      textAlign: 'center', color: '#444', fontSize: '0.7rem',
                      letterSpacing: '0.08em', my: 1.5,
                    }}>
                      {msgDate}
                    </Typography>
                  )}
                  <Box sx={{
                    display: 'flex',
                    justifyContent: isMine ? 'flex-end' : 'flex-start',
                  }}>
                    <Box
                      onMouseDown={() => startLongPress(msg)}
                      onMouseUp={cancelLongPress}
                      onMouseLeave={cancelLongPress}
                      onTouchStart={() => startLongPress(msg)}
                      onTouchEnd={cancelLongPress}
                      onContextMenu={(e) => { if (isMine) { e.preventDefault(); setSelectedMsg(msg); } }}
                      sx={{
                        maxWidth: '75%',
                        p: '8px 14px',
                        borderRadius: isMine ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                        bgcolor: isMine ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${isMine ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)'}`,
                        animation: 'fadeIn 0.2s ease',
                        userSelect: 'none', WebkitUserSelect: 'none',
                        cursor: isMine ? 'pointer' : 'default',
                      }}>
                      <Typography sx={{
                        fontSize: '0.88rem', color: isMine ? '#e0e0e0' : '#bbb',
                        lineHeight: 1.45, wordBreak: 'break-word',
                        whiteSpace: 'pre-wrap',
                      }}>
                        {msg.text}
                      </Typography>
                      <Typography sx={{
                        fontSize: '0.62rem', color: '#444',
                        textAlign: isMine ? 'right' : 'left',
                        mt: 0.3,
                      }}>
                        {formatTime(msg.created_at)}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              );
            })}
            <div ref={messagesEndRef} />
          </Box>
        )}
      </Box>

      <Box sx={{
        flexShrink: 0,
        p: '10px 16px',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        background: 'rgba(5,5,5,0.9)',
        backdropFilter: 'blur(24px)',
      }}>
        <Box sx={{
          display: 'flex', gap: 1, alignItems: 'flex-end',
          maxWidth: 600, mx: 'auto',
          bgcolor: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 3, p: '6px 12px',
        }}>
          <TextField
            placeholder="Сообщение..."
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            multiline
            maxRows={4}
            variant="standard"
            fullWidth
            InputProps={{ disableUnderline: true }}
            sx={{
              '& textarea, & input': { color: '#ccc', fontSize: '0.88rem', py: 0.5 },
              '& textarea::placeholder, & input::placeholder': { color: '#333' },
            }}
          />
          <IconButton
            onClick={handleSend}
            disabled={!text.trim() || sending}
            size="small"
            sx={{
              color: text.trim() ? '#fff' : '#333',
              transition: 'all 0.2s ease',
              mb: 0.3,
            }}
          >
            <SendIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Box>
      </Box>

      <Dialog
        open={!!selectedMsg}
        onClose={() => setSelectedMsg(null)}
        PaperProps={{
          sx: {
            bgcolor: '#111', borderRadius: 3, p: 2.5, width: '100%', maxWidth: 320,
            border: '1px solid rgba(255,255,255,0.06)',
          }
        }}
      >
        <Typography sx={{ color: '#fff', fontSize: '0.95rem', fontWeight: 500, mb: 0.5 }}>
          Удалить сообщение?
        </Typography>
        <Typography sx={{ color: '#555', fontSize: '0.8rem', mb: 2 }}>
          Сообщение будет удалено безвозвратно
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            onClick={() => setSelectedMsg(null)}
            fullWidth
            sx={{
              py: 1, borderRadius: '10px', color: '#888',
              border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.8rem',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' },
            }}
          >
            Отмена
          </Button>
          <Button
            onClick={handleDelete}
            fullWidth
            sx={{
              py: 1, borderRadius: '10px', color: '#ff5050',
              border: '1px solid rgba(255,60,60,0.2)', fontSize: '0.8rem',
              '&:hover': { bgcolor: 'rgba(255,60,60,0.08)' },
            }}
          >
            <DeleteOutlineIcon sx={{ fontSize: 16, mr: 0.5 }} />
            Удалить
          </Button>
        </Box>
      </Dialog>
    </Box>
  );
}
