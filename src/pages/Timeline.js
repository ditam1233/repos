import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getPairMoments, getUser, deleteMoment } from '../utils/storage';
import MomentCard from '../components/MomentCard';
import {
  Box, AppBar, Toolbar, Typography, Avatar, IconButton,
  CircularProgress, Snackbar,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

function groupByMonth(moments) {
  const sorted = [...moments].sort((a, b) => new Date(b.date) - new Date(a.date));
  const groups = [];
  let currentKey = null;

  for (const m of sorted) {
    const d = new Date(m.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const label = d.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });

    if (key !== currentKey) {
      groups.push({ key, label, moments: [] });
      currentKey = key;
    }
    groups[groups.length - 1].moments.push(m);
  }
  return groups;
}

function TimelineItem({ moment, index, currentUserId, onDelete }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  const isLeft = index % 2 === 0;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const formattedDate = new Date(moment.date).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'short',
  });

  return (
    <Box ref={ref} sx={{
      display: 'flex', position: 'relative',
      justifyContent: { xs: 'flex-start', md: isLeft ? 'flex-start' : 'flex-end' },
      pl: { xs: 4, md: 0 },
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(20px)',
      transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
    }}>
      {/* Dot on the line */}
      <Box sx={{
        position: 'absolute',
        left: { xs: 11, md: '50%' },
        transform: { xs: 'none', md: 'translateX(-50%)' },
        top: 18,
        width: 10, height: 10, borderRadius: '50%',
        bgcolor: moment.photo_url ? '#fff' : 'rgba(255,255,255,0.15)',
        border: '2px solid #0c0c0c',
        zIndex: 2,
        transition: 'all 0.3s ease',
      }} />

      {/* Card */}
      <Box sx={{
        width: { xs: '100%', md: 'calc(50% - 32px)' },
        ml: { xs: 0, md: isLeft ? 0 : 'auto' },
        mr: { xs: 0, md: isLeft ? 'auto' : 0 },
      }}>
        <MomentCard moment={moment} currentUserId={currentUserId} onDelete={onDelete} />
      </Box>
    </Box>
  );
}

export default function Timeline() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [moments, setMoments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snack, setSnack] = useState({ open: false, message: '', type: 'success' });
  const [cachedAvatar, setCachedAvatar] = useState(() =>
    typeof window !== 'undefined' ? sessionStorage.getItem('avatar_cache') || null : null
  );

  useEffect(() => {
    const url = user?.avatar_url;
    if (url && url !== cachedAvatar) {
      const img = new Image();
      img.onload = () => { sessionStorage.setItem('avatar_cache', url); setCachedAvatar(url); };
      img.src = url;
    }
  }, [user?.avatar_url]);

  const loadMoments = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const data = await getPairMoments(user.id);
    setMoments(data);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    loadMoments();
  }, [user, navigate, loadMoments]);

  if (!user) return null;

  const groups = groupByMonth(moments);

  const handleDelete = async (id) => {
    await deleteMoment(id);
    await loadMoments();
    setSnack({ open: true, message: 'Момент удалён', type: 'error' });
  };

  let globalIndex = 0;

  return (
    <Box sx={{ minHeight: '100dvh', background: '#050505', pb: 8 }}>
      {/* Header */}
      <AppBar position="sticky" elevation={0} sx={{
        background: 'rgba(5,5,5,0.85)', backdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(255,255,255,0.03)',
      }}>
        <Toolbar sx={{ justifyContent: 'space-between', minHeight: '56px !important', px: { xs: 2, sm: 3 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton onClick={() => navigate('/home')} sx={{ color: '#888', '&:hover': { color: '#fff' } }}>
              <ArrowBackIcon fontSize="small" />
            </IconButton>
            <Typography sx={{
              fontSize: '1rem', fontWeight: 200, letterSpacing: '0.2em',
              color: '#fff', textTransform: 'uppercase',
            }}>
              Timeline
            </Typography>
          </Box>
          <Avatar
            src={cachedAvatar || user?.avatar_url || undefined}
            onClick={() => navigate('/profile')}
            sx={{
              width: 36, height: 36, cursor: 'pointer',
              bgcolor: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#ccc', fontSize: '0.85rem', fontWeight: 400,
              transition: 'all 0.3s ease',
              '&:hover': { borderColor: 'rgba(255,255,255,0.25)' },
            }}
          >
            {(user?.display_name || user?.username)?.charAt(0).toUpperCase()}
          </Avatar>
        </Toolbar>
      </AppBar>

      <Box sx={{ maxWidth: 900, mx: 'auto', px: { xs: 2, sm: 3 }, pt: 3, position: 'relative' }}>
        {/* Vertical line */}
        <Box sx={{
          position: 'absolute',
          left: { xs: 26, md: '50%' },
          transform: { xs: 'none', md: 'translateX(-50%)' },
          top: 0, bottom: 0,
          width: 2, bgcolor: 'rgba(255,255,255,0.06)',
        }} />

        {loading && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 8 }}>
            <CircularProgress size={28} sx={{ color: 'rgba(255,255,255,0.3)' }} />
            <Typography sx={{ color: '#333', fontSize: '0.82rem' }}>Загрузка...</Typography>
          </Box>
        )}

        {!loading && moments.length === 0 && (
          <Typography sx={{ textAlign: 'center', color: '#222', py: 8, fontSize: '0.85rem' }}>
            Пока нет моментов
          </Typography>
        )}

        {groups.map(group => (
          <Box key={group.key} sx={{ mb: 4 }}>
            {/* Month label */}
            <Box sx={{
              display: 'flex', alignItems: 'center',
              justifyContent: { xs: 'flex-start', md: 'center' },
              pl: { xs: 4, md: 0 },
              mb: 2, position: 'relative',
            }}>
              <Typography sx={{
                fontSize: '0.68rem', color: '#444', letterSpacing: '0.15em',
                textTransform: 'uppercase', fontWeight: 500,
                bgcolor: '#050505', px: 2, position: 'relative', zIndex: 1,
              }}>
                {group.label}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {group.moments.map(m => {
                const idx = globalIndex++;
                return (
                  <TimelineItem
                    key={m.id}
                    moment={m}
                    index={idx}
                    currentUserId={user.id}
                    onDelete={handleDelete}
                  />
                );
              })}
            </Box>
          </Box>
        ))}
      </Box>

      <Snackbar
        open={snack.open}
        autoHideDuration={2500}
        onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        ContentProps={{
          sx: {
            bgcolor: snack.type === 'success' ? 'rgba(40,180,80,0.12)' : 'rgba(255,60,60,0.12)',
            backdropFilter: 'blur(20px)',
            border: `1px solid ${snack.type === 'success' ? 'rgba(40,180,80,0.25)' : 'rgba(255,60,60,0.25)'}`,
            borderRadius: 3,
            color: snack.type === 'success' ? '#4ade80' : '#ff5050',
            fontSize: '0.88rem', fontWeight: 300, letterSpacing: '0.03em',
            minWidth: 'auto', px: 3, py: 1,
          },
        }}
        message={snack.message}
      />
    </Box>
  );
}
