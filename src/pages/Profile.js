import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUser, getPairMoments, updateProfile, uploadAvatar } from '../utils/storage';
import {
  Box, AppBar, Toolbar, Typography, Avatar, Button, Card,
  List, ListItem, Dialog, DialogTitle, DialogContent, TextField, Fab, IconButton, CircularProgress,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import UpdateIcon from '@mui/icons-material/Update';
import CameraAltIcon from '@mui/icons-material/CameraAlt';

export default function Profile() {
  const { user, logout, refresh } = useAuth();
  const navigate = useNavigate();
  const [partner, setPartner] = useState(null);
  const [momentCount, setMomentCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [editPassword, setEditPassword] = useState('');
  const [editError, setEditError] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    if (user.partner_id) {
      getUser(user.partner_id).then(setPartner);
      getPairMoments(user.id).then(m => setMomentCount(m.length));
    }
  }, [user, navigate]);

  if (!user) return null;

  const handleLogout = () => { navigate('/'); logout(); };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(user.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEdit = () => {
    setEditName(user.display_name || user.username);
    setEditPassword('');
    setShowPassword(false);
    setEditError('');
    setEditing(true);
  };

  const handleSave = async () => {
    if (!editName.trim()) { setEditError('Имя не может быть пустым'); return; }
    setEditLoading(true);
    setEditError('');
    const updates = { displayName: editName.trim() };
    if (editPassword.trim()) updates.password = editPassword.trim();
    const result = await updateProfile(user.id, updates);
    setEditLoading(false);
    if (result.error) { setEditError(result.error); return; }
    await refresh();
    setEditing(false);
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarLoading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const result = await uploadAvatar(user.id, reader.result);
      if (result?.error) console.error('Avatar upload error:', result.error);
      await refresh();
      setAvatarLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const displayName = user.display_name || user.username;
  const createdAt = user.created_at
    ? new Date(user.created_at).toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  const changelog = [
    { date: '1 марта 2026', text: 'Добавлена страница профиля с редактированием имени и пароля' },
    { date: '1 марта 2026', text: 'Аватарка с выпадающим меню вместо кнопки «Выйти»' },
    { date: '1 марта 2026', text: 'Просмотр момента по клику с полноэкранным фото' },
    { date: '1 марта 2026', text: 'Дата момента отображается поверх фото' },
    { date: '1 марта 2026', text: 'Индикатор загрузки моментов' },
    { date: '1 марта 2026', text: 'Имя пары отображается в шапке сайта' },
  ];

  return (
    <Box sx={{ minHeight: '100dvh', background: '#050505' }}>
      {/* Header */}
      <AppBar position="sticky" elevation={0} sx={{
        background: 'rgba(5,5,5,0.85)', backdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(255,255,255,0.03)',
      }}>
        <Toolbar sx={{ justifyContent: 'space-between', minHeight: '56px !important', px: { xs: 2, sm: 3 } }}>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/home')}
            sx={{ color: '#666', fontSize: '0.82rem', textTransform: 'none', '&:hover': { color: '#fff', bgcolor: 'transparent' } }}
          >
            Назад
          </Button>
          <Typography sx={{ fontSize: '1rem', fontWeight: 200, letterSpacing: '0.2em', color: '#fff', textTransform: 'uppercase' }}>
            Профиль
          </Typography>
          <Box sx={{ width: 70 }} />
        </Toolbar>
      </AppBar>

      {/* Content */}
      <Box sx={{
        maxWidth: 460, mx: 'auto', p: { xs: '36px 16px', sm: '48px 24px' },
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        animation: 'fadeIn 0.4s ease',
      }}>
        <Box sx={{ position: 'relative', mb: 2 }}>
          <Avatar
            src={user.avatar_url || undefined}
            sx={{
              width: 80, height: 80,
              bgcolor: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#ccc', fontSize: '2rem', fontWeight: 300,
            }}
          >
            {displayName.charAt(0).toUpperCase()}
          </Avatar>
          <IconButton
            component="label"
            size="small"
            disabled={avatarLoading}
            sx={{
              position: 'absolute', bottom: -4, right: -4,
              bgcolor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
              color: '#aaa', width: 28, height: 28,
              '&:hover': { bgcolor: 'rgba(255,255,255,0.2)', color: '#fff' },
            }}
          >
            {avatarLoading ? <CircularProgress size={14} sx={{ color: '#aaa' }} /> : <CameraAltIcon sx={{ fontSize: 14 }} />}
            <input type="file" accept="image/*" onChange={handleAvatarChange} hidden />
          </IconButton>
        </Box>
        <Typography sx={{ color: '#fff', fontSize: '1.3rem', fontWeight: 300, letterSpacing: '0.05em', mb: 0.5 }}>
          {displayName}
        </Typography>
        <Typography sx={{ color: '#444', fontSize: '0.8rem', mb: 4 }}>
          @{user.username}
        </Typography>

        <Card sx={{ width: '100%', mb: 4, borderRadius: 4, overflow: 'hidden', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <List disablePadding>
            <ListItem sx={{ justifyContent: 'space-between', py: 2, px: 2.5, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <Typography sx={{ color: '#555', fontSize: '0.82rem' }}>Ваш код</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography sx={{
                  color: '#ccc', fontSize: '0.85rem',
                  fontFamily: "'SF Mono', 'Fira Code', monospace", letterSpacing: '0.15em',
                }}>
                  {user.code}
                </Typography>
                <IconButton size="small" onClick={handleCopyCode} sx={{ color: '#999', '&:hover': { color: '#fff' } }}>
                  {copied ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
                </IconButton>
              </Box>
            </ListItem>
            {partner && (
              <ListItem sx={{ justifyContent: 'space-between', py: 2, px: 2.5, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <Typography sx={{ color: '#555', fontSize: '0.82rem' }}>Пара</Typography>
                <Typography sx={{ color: '#ccc', fontSize: '0.85rem' }}>{partner.display_name || partner.username}</Typography>
              </ListItem>
            )}
            {partner && (
              <ListItem sx={{ justifyContent: 'space-between', py: 2, px: 2.5, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <Typography sx={{ color: '#555', fontSize: '0.82rem' }}>Моментов</Typography>
                <Typography sx={{ color: '#ccc', fontSize: '0.85rem' }}>{momentCount}</Typography>
              </ListItem>
            )}
            {createdAt && (
              <ListItem sx={{ justifyContent: 'space-between', py: 2, px: 2.5 }}>
                <Typography sx={{ color: '#555', fontSize: '0.82rem' }}>Регистрация</Typography>
                <Typography sx={{ color: '#ccc', fontSize: '0.85rem' }}>{createdAt}</Typography>
              </ListItem>
            )}
          </List>
        </Card>

        <Button fullWidth onClick={handleEdit} sx={{
          py: 1.5, mb: 1.5, borderRadius: 3,
          bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
          color: '#aaa', fontSize: '0.85rem', textTransform: 'none',
          '&:hover': { borderColor: 'rgba(255,255,255,0.2)', color: '#fff', bgcolor: 'rgba(255,255,255,0.05)' },
        }}>
          Редактировать профиль
        </Button>
        <Button fullWidth onClick={handleLogout} sx={{
          py: 1.5, borderRadius: 3,
          border: '1px solid rgba(255,80,80,0.12)', color: '#664444',
          fontSize: '0.85rem', textTransform: 'none',
          '&:hover': { borderColor: 'rgba(255,80,80,0.4)', color: '#ff5050', bgcolor: 'rgba(255,80,80,0.04)' },
        }}>
          Выйти из аккаунта
        </Button>
      </Box>

      {/* Changelog FAB */}
      <Fab size="small" onClick={() => setShowChangelog(true)} sx={{
        position: 'fixed', bottom: { xs: 16, sm: 24 }, right: { xs: 16, sm: 24 },
        bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
        color: '#888', width: 40, height: 40,
        '&:hover': { borderColor: 'rgba(255,255,255,0.18)', color: '#aaa', bgcolor: 'rgba(255,255,255,0.06)' },
      }}>
        <UpdateIcon fontSize="small" />
      </Fab>

      {/* Changelog dialog */}
      <Dialog open={showChangelog} onClose={() => setShowChangelog(false)} PaperProps={{ sx: { p: 3, width: '100%', maxWidth: 420 } }}>
        <DialogTitle sx={{ p: 0, mb: 1, color: '#fff', fontWeight: 300, letterSpacing: '0.05em', fontSize: '1.15rem' }}>
          Обновления
        </DialogTitle>
        <DialogContent sx={{ p: '0 !important', maxHeight: '50vh', overflowY: 'auto' }}>
          {changelog.map((item, i) => (
            <Box key={i} sx={{ pb: 2, mb: 2, borderBottom: i < changelog.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
              <Typography sx={{ fontSize: '0.68rem', color: '#444', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {item.date}
              </Typography>
              <Typography sx={{ color: '#bbb', fontSize: '0.84rem', mt: 0.5, lineHeight: 1.5 }}>
                {item.text}
              </Typography>
            </Box>
          ))}
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editing} onClose={() => setEditing(false)} PaperProps={{ sx: { p: 3, width: '100%', maxWidth: 420 } }}>
        <DialogTitle sx={{ p: 0, mb: 0.5, color: '#fff', fontWeight: 300, letterSpacing: '0.05em', fontSize: '1.15rem' }}>
          Редактировать профиль
        </DialogTitle>
        <DialogContent sx={{ p: '0 !important' }}>
          <Typography sx={{ color: '#333', fontSize: '0.8rem', mb: 2 }}>Измените данные профиля</Typography>
          <TextField
            placeholder="Имя"
            value={editName}
            onChange={e => setEditName(e.target.value)}
            sx={{ mb: 1.5 }}
          />
          {!showPassword ? (
            <Button fullWidth onClick={() => setShowPassword(true)} sx={{
              py: 1.5, mb: 1.5, borderRadius: 3,
              bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
              color: '#666', fontSize: '0.85rem', textTransform: 'none',
              '&:hover': { borderColor: 'rgba(255,255,255,0.15)', color: '#aaa' },
            }}>
              Изменить пароль
            </Button>
          ) : (
            <TextField
              type="password"
              placeholder="Новый пароль"
              value={editPassword}
              onChange={e => setEditPassword(e.target.value)}
              autoFocus
              sx={{ mb: 1.5 }}
            />
          )}
          {editError && <Typography sx={{ color: '#ff4444', fontSize: '0.82rem', mb: 1.5, animation: 'fadeIn 0.3s ease' }}>{editError}</Typography>}
          <Button fullWidth variant="contained" onClick={handleSave} disabled={editLoading}
            sx={{
              py: 1.5, borderRadius: '12px', background: '#fff', color: '#050505', fontWeight: 600,
              '&:hover': { background: '#fff', boxShadow: '0 8px 30px rgba(255,255,255,0.12)' },
              '&:disabled': { opacity: 0.4, background: '#fff', color: '#050505' },
            }}
          >
            {editLoading ? '...' : 'Сохранить'}
          </Button>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
