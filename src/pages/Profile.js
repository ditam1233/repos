import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUser, getPairMoments, updateProfile, uploadAvatar, unlinkPartner, getPairStats, getPairRecentPhotos } from '../utils/storage';
import {
  Box, AppBar, Toolbar, Typography, Avatar, Button, Card,
  List, ListItem, Dialog, DialogTitle, DialogContent, TextField, Fab, IconButton, CircularProgress, Slider, Modal,
} from '@mui/material';
import HeartBrokenIcon from '@mui/icons-material/HeartBroken';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import UpdateIcon from '@mui/icons-material/Update';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import CloseIcon from '@mui/icons-material/Close';
import Cropper from 'react-easy-crop';

export default function Profile() {
  const { user, logout, refresh } = useAuth();
  const navigate = useNavigate();
  const { id: profileId } = useParams();
  const isOwnProfile = !profileId || profileId === user?.id;
  const [profileUser, setProfileUser] = useState(null);
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
  const [showUnlink, setShowUnlink] = useState(false);
  const [unlinkLoading, setUnlinkLoading] = useState(false);
  const [cropImage, setCropImage] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [stats, setStats] = useState({ photos: 0, comments: 0, reactions: 0 });
  const [recentPhotos, setRecentPhotos] = useState([]);
  const [fullPhoto, setFullPhoto] = useState(null);

  const onCropComplete = useCallback((_, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    if (isOwnProfile) {
      setProfileUser(user);
      if (user.partner_id) {
        getUser(user.partner_id).then(setPartner);
        getPairMoments(user.id).then(m => setMomentCount(m.length));
        getPairStats(user.id).then(setStats);
        getPairRecentPhotos(user.id, 4).then(setRecentPhotos);
      }
    } else {
      getUser(profileId).then(p => {
        if (!p) { navigate('/home'); return; }
        setProfileUser(p);
        if (p.partner_id) {
          getUser(p.partner_id).then(setPartner);
          getPairMoments(p.id).then(m => setMomentCount(m.length));
          getPairStats(p.id).then(setStats);
          getPairRecentPhotos(p.id, 4).then(setRecentPhotos);
        }
      });
    }
  }, [user, navigate, profileId, isOwnProfile]);

  if (!user || !profileUser) return null;

  const viewUser = profileUser;
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

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCropImage(reader.result);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const getCroppedImg = (imageSrc, pixelCrop) => {
    return new Promise((resolve) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = pixelCrop.width;
        canvas.height = pixelCrop.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height);
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };
      image.src = imageSrc;
    });
  };

  const handleCropSave = async () => {
    if (!cropImage || !croppedAreaPixels) return;
    setAvatarLoading(true);
    setCropImage(null);
    const croppedBase64 = await getCroppedImg(cropImage, croppedAreaPixels);
    const result = await uploadAvatar(user.id, croppedBase64);
    if (result?.error) console.error('Avatar upload error:', result.error);
    await refresh();
    setAvatarLoading(false);
  };

  const handleUnlink = async () => {
    setUnlinkLoading(true);
    await unlinkPartner(user.id);
    await refresh();
    setShowUnlink(false);
    setUnlinkLoading(false);
    setPartner(null);
    setMomentCount(0);
  };

  const displayName = viewUser.display_name || viewUser.username;
  const createdAt = viewUser.created_at
    ? new Date(viewUser.created_at).toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  const pairedAt = viewUser.paired_at;
  const daysTogether = pairedAt ? Math.max(1, Math.floor((Date.now() - new Date(pairedAt).getTime()) / 86400000)) : 0;
  const daysWord = (() => {
    if (!daysTogether) return '';
    const d = daysTogether;
    if (d % 10 === 1 && d % 100 !== 11) return 'день';
    if ([2,3,4].includes(d % 10) && ![12,13,14].includes(d % 100)) return 'дня';
    return 'дней';
  })();

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
            {isOwnProfile ? 'Профиль' : displayName}
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
            src={viewUser.avatar_url || undefined}
            sx={{
              width: 80, height: 80,
              bgcolor: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#ccc', fontSize: '2rem', fontWeight: 300,
            }}
          >
            {displayName.charAt(0).toUpperCase()}
          </Avatar>
          {isOwnProfile && (
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
          )}
        </Box>
        <Typography sx={{ color: '#fff', fontSize: '1.3rem', fontWeight: 300, letterSpacing: '0.05em', mb: 0.5 }}>
          {displayName}
        </Typography>
        <Typography sx={{ color: '#444', fontSize: '0.8rem', mb: 4 }}>
          @{viewUser.username}
        </Typography>

        <Card sx={{ width: '100%', mb: 4, borderRadius: 4, overflow: 'hidden', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <List disablePadding>
            {isOwnProfile && (
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
            )}
            {partner && (
              <ListItem
                onClick={() => {
                  const targetId = isOwnProfile ? partner.id : viewUser.partner_id;
                  if (targetId && targetId !== user.id) navigate(`/profile/${targetId}`);
                  else if (targetId === user.id) navigate('/profile');
                }}
                sx={{
                  justifyContent: 'space-between', py: 2, px: 2.5,
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  cursor: 'pointer', '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' },
                }}
              >
                <Typography sx={{ color: '#555', fontSize: '0.82rem' }}>Пара</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography sx={{ color: '#ccc', fontSize: '0.85rem' }}>{partner.display_name || partner.username}</Typography>
                  <Avatar
                    src={partner.avatar_url || undefined}
                    sx={{ width: 22, height: 22, fontSize: '0.6rem', bgcolor: 'rgba(255,255,255,0.1)' }}
                  >
                    {(partner.display_name || partner.username).charAt(0).toUpperCase()}
                  </Avatar>
                </Box>
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

        {/* Days together — only on partner's profile */}
        {!isOwnProfile && partner && daysTogether > 0 && (
          <Box sx={{ width: '100%', mb: 3, textAlign: 'center' }}>
            <Typography sx={{ color: '#333', fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase', mb: 0.5 }}>
              Вместе
            </Typography>
            <Typography sx={{ color: '#fff', fontSize: '1.8rem', fontWeight: 200, letterSpacing: '0.05em' }}>
              {daysTogether}
            </Typography>
            <Typography sx={{ color: '#444', fontSize: '0.75rem' }}>
              {daysWord}
            </Typography>
          </Box>
        )}

        {/* Stats — only on partner's profile */}
        {!isOwnProfile && partner && (stats.photos > 0 || stats.comments > 0 || stats.reactions > 0) && (
          <Box sx={{
            width: '100%', mb: 3, display: 'flex', justifyContent: 'center', gap: 3,
          }}>
            <Box sx={{ textAlign: 'center' }}>
              <PhotoLibraryIcon sx={{ color: '#444', fontSize: 18, mb: 0.3 }} />
              <Typography sx={{ color: '#ccc', fontSize: '1rem', fontWeight: 300 }}>{stats.photos}</Typography>
              <Typography sx={{ color: '#444', fontSize: '0.65rem', letterSpacing: '0.05em' }}>фото</Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <ChatBubbleOutlineIcon sx={{ color: '#444', fontSize: 18, mb: 0.3 }} />
              <Typography sx={{ color: '#ccc', fontSize: '1rem', fontWeight: 300 }}>{stats.comments}</Typography>
              <Typography sx={{ color: '#444', fontSize: '0.65rem', letterSpacing: '0.05em' }}>комментов</Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <FavoriteBorderIcon sx={{ color: '#444', fontSize: 18, mb: 0.3 }} />
              <Typography sx={{ color: '#ccc', fontSize: '1rem', fontWeight: 300 }}>{stats.reactions}</Typography>
              <Typography sx={{ color: '#444', fontSize: '0.65rem', letterSpacing: '0.05em' }}>реакций</Typography>
            </Box>
          </Box>
        )}

        {/* Recent photos gallery — only on partner's profile */}
        {!isOwnProfile && recentPhotos.length > 0 && (
          <Box sx={{ width: '100%', mb: 4 }}>
            <Typography sx={{ color: '#444', fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', mb: 1.5 }}>
              Последние фото
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0.75 }}>
              {recentPhotos.map((url, i) => (
                <Box
                  key={i}
                  onClick={() => setFullPhoto(url)}
                  sx={{
                    aspectRatio: '1', borderRadius: 2, overflow: 'hidden', cursor: 'pointer',
                    border: '1px solid rgba(255,255,255,0.04)',
                    transition: 'all 0.3s ease',
                    '&:hover': { borderColor: 'rgba(255,255,255,0.15)', transform: 'scale(1.03)' },
                  }}
                >
                  <Box component="img" src={url} alt="" sx={{
                    width: '100%', height: '100%', objectFit: 'cover',
                    opacity: 0.85, transition: 'opacity 0.3s ease',
                    '&:hover': { opacity: 1 },
                  }} />
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {isOwnProfile && (
          <>
            <Button fullWidth onClick={handleEdit} sx={{
              py: 1.5, mb: 1.5, borderRadius: 3,
              bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
              color: '#aaa', fontSize: '0.85rem', textTransform: 'none',
              '&:hover': { borderColor: 'rgba(255,255,255,0.2)', color: '#fff', bgcolor: 'rgba(255,255,255,0.05)' },
            }}>
              Редактировать профиль
            </Button>
            {partner && (
              <Button fullWidth onClick={() => setShowUnlink(true)} startIcon={<HeartBrokenIcon sx={{ fontSize: '16px !important' }} />} sx={{
                py: 1.5, mb: 1.5, borderRadius: 3,
                border: '1px solid rgba(255,80,80,0.08)', color: '#553333',
                fontSize: '0.85rem', textTransform: 'none',
                '&:hover': { borderColor: 'rgba(255,80,80,0.3)', color: '#ff5050', bgcolor: 'rgba(255,80,80,0.04)' },
              }}>
                Разорвать пару
              </Button>
            )}
            <Button fullWidth onClick={handleLogout} sx={{
              py: 1.5, borderRadius: 3,
              border: '1px solid rgba(255,80,80,0.12)', color: '#664444',
              fontSize: '0.85rem', textTransform: 'none',
              '&:hover': { borderColor: 'rgba(255,80,80,0.4)', color: '#ff5050', bgcolor: 'rgba(255,80,80,0.04)' },
            }}>
              Выйти из аккаунта
            </Button>
          </>
        )}
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

      {/* Unlink dialog */}
      <Dialog open={showUnlink} onClose={() => setShowUnlink(false)} PaperProps={{ sx: { p: 3, width: '100%', maxWidth: 380 } }}>
        <DialogTitle sx={{ p: 0, mb: 1, color: '#fff', fontWeight: 300, letterSpacing: '0.05em', fontSize: '1.15rem' }}>
          Разорвать пару?
        </DialogTitle>
        <DialogContent sx={{ p: '0 !important' }}>
          <Typography sx={{ color: '#666', fontSize: '0.84rem', mb: 3, lineHeight: 1.6 }}>
            Связь с {partner?.display_name || partner?.username} будет разорвана. Все совместные моменты будут удалены.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button fullWidth onClick={() => setShowUnlink(false)} sx={{
              py: 1.3, borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)',
              color: '#aaa', fontSize: '0.85rem', textTransform: 'none',
              '&:hover': { borderColor: 'rgba(255,255,255,0.2)', color: '#fff' },
            }}>
              Отмена
            </Button>
            <Button fullWidth onClick={handleUnlink} disabled={unlinkLoading} sx={{
              py: 1.3, borderRadius: 3, bgcolor: 'rgba(255,50,50,0.1)', border: '1px solid rgba(255,50,50,0.2)',
              color: '#ff5050', fontSize: '0.85rem', textTransform: 'none',
              '&:hover': { bgcolor: 'rgba(255,50,50,0.2)', borderColor: 'rgba(255,50,50,0.4)' },
              '&:disabled': { opacity: 0.4 },
            }}>
              {unlinkLoading ? '...' : 'Разорвать'}
            </Button>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Avatar crop dialog */}
      <Dialog open={!!cropImage} onClose={() => setCropImage(null)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { p: 0, overflow: 'hidden', maxWidth: 400 } }}>
        <DialogTitle sx={{ px: 2.5, py: 2, color: '#fff', fontWeight: 300, letterSpacing: '0.05em', fontSize: '1.05rem' }}>
          Обрезать фото
        </DialogTitle>
        <Box sx={{ position: 'relative', width: '100%', height: 300, bgcolor: '#111' }}>
          {cropImage && (
            <Cropper
              image={cropImage}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          )}
        </Box>
        <Box sx={{ px: 3, py: 1.5 }}>
          <Slider
            value={zoom}
            min={1}
            max={3}
            step={0.1}
            onChange={(_, v) => setZoom(v)}
            sx={{
              color: '#fff',
              '& .MuiSlider-thumb': { width: 16, height: 16 },
              '& .MuiSlider-track': { height: 2 },
              '& .MuiSlider-rail': { height: 2, opacity: 0.2 },
            }}
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, px: 2.5, pb: 2.5 }}>
          <Button fullWidth onClick={() => setCropImage(null)} sx={{
            py: 1.3, borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)',
            color: '#aaa', fontSize: '0.85rem', textTransform: 'none',
            '&:hover': { borderColor: 'rgba(255,255,255,0.2)', color: '#fff' },
          }}>
            Отмена
          </Button>
          <Button fullWidth onClick={handleCropSave} sx={{
            py: 1.3, borderRadius: 3, bgcolor: '#fff', color: '#050505',
            fontSize: '0.85rem', textTransform: 'none', fontWeight: 600,
            '&:hover': { bgcolor: '#fff', boxShadow: '0 4px 20px rgba(255,255,255,0.12)' },
          }}>
            Сохранить
          </Button>
        </Box>
      </Dialog>

      {/* Fullscreen photo */}
      <Modal open={!!fullPhoto} onClose={() => setFullPhoto(null)}>
        <Box onClick={() => setFullPhoto(null)} sx={{
          position: 'fixed', inset: 0,
          bgcolor: 'rgba(0,0,0,0.95)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'zoom-out', zIndex: 1300,
        }}>
          <IconButton onClick={() => setFullPhoto(null)} sx={{
            position: 'absolute', top: 16, right: 16, zIndex: 3,
            bgcolor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
            color: '#ccc', width: 36, height: 36,
            '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.2)' },
          }}>
            <CloseIcon />
          </IconButton>
          <Box component="img" src={fullPhoto} alt="" sx={{
            maxWidth: '95vw', maxHeight: '95vh', objectFit: 'contain', borderRadius: 1,
          }} />
        </Box>
      </Modal>

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
