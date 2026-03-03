import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider, useAuth } from './context/AuthContext';
import { subscribeToMessages, unsubscribe } from './utils/realtime';
import { getUser } from './utils/storage';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Box, Typography } from '@mui/material';
import theme from './theme';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import Home from './pages/Home';
import Profile from './pages/Profile';
import Timeline from './pages/Timeline';
import Wishlist from './pages/Wishlist';
import Chat from './pages/Chat';
import './App.css';

function NotificationListener() {
  const { user } = useAuth();
  const channelRef = useRef(null);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const showToast = useCallback((name, text) => {
    clearTimeout(toastTimer.current);
    setToast({ name, text });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => {
    if (!user?.partner_id) return;

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    channelRef.current = subscribeToMessages(user.id, user.partner_id, async (msg) => {
      if (msg.sender_id === user.id) return;

      const isOnChat = window.location.pathname.endsWith('/chat');
      const partner = await getUser(msg.sender_id);
      const name = partner?.display_name || partner?.username || 'Партнёр';

      if (!isOnChat) {
        showToast(name, msg.text);

        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification(name, {
              body: msg.text,
              icon: partner?.avatar_url || undefined,
              tag: 'chat-msg-' + msg.id,
            });
          } catch {
            // Safari/iOS не поддерживает new Notification — пропускаем
          }
        }
      }
    });

    return () => {
      unsubscribe(channelRef.current);
      clearTimeout(toastTimer.current);
    };
  }, [user, showToast]);

  if (!toast) return null;

  return (
    <Box
      onClick={() => {
        setToast(null);
        window.location.href = window.location.pathname.replace(/\/[^/]*$/, '/chat');
      }}
      sx={{
        position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
        zIndex: 9999, cursor: 'pointer',
        bgcolor: 'rgba(20,20,20,0.95)', backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3,
        px: 2.5, py: 1.5, maxWidth: 340, width: '90%',
        animation: 'slideDown 0.3s ease',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}
    >
      <Typography sx={{ fontSize: '0.8rem', color: '#fff', fontWeight: 600 }}>
        {toast.name}
      </Typography>
      <Typography sx={{
        fontSize: '0.75rem', color: '#888', mt: 0.3,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {toast.text}
      </Typography>
    </Box>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter basename="/repos">
          <NotificationListener />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/home" element={<Home />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/:id" element={<Profile />} />
            <Route path="/timeline" element={<Timeline />} />
            <Route path="/wishlist" element={<Wishlist />} />
            <Route path="/chat" element={<Chat />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
