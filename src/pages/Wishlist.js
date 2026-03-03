import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getWishes, createWish, updateWish, toggleWishCompleted, deleteWish, getUser } from '../utils/storage';
import {
  Box, AppBar, Toolbar, Typography, Avatar, IconButton,
  TextField, CircularProgress, Snackbar, Dialog, DialogTitle, DialogContent, Button,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/Add';
import LinkIcon from '@mui/icons-material/Link';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';

export default function Wishlist() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [wishes, setWishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [partner, setPartner] = useState(null);
  const [snack, setSnack] = useState({ open: false, message: '', type: 'success' });
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ text: '', description: '', link: '', price: '', photo: null });
  const [photoPreview, setPhotoPreview] = useState(null);
  const [selectedWish, setSelectedWish] = useState(null);
  const [editingWish, setEditingWish] = useState(null);
  const [cachedAvatar] = useState(() =>
    typeof window !== 'undefined' ? sessionStorage.getItem('avatar_cache') || null : null
  );

  const loadWishes = useCallback(async () => {
    if (!user?.partner_id) return;
    setLoading(true);
    const data = await getWishes(user.id, user.partner_id);
    setWishes(data);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    if (!user.partner_id) { navigate('/home'); return; }
    getUser(user.partner_id).then(setPartner);
    loadWishes();
  }, [user, navigate, loadWishes]);

  const myWishes = wishes.filter(w => w.author_id === user?.id);
  const partnerWishes = wishes.filter(w => w.author_id === user?.partner_id);

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setForm(f => ({ ...f, photo: reader.result }));
      setPhotoPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.text.trim() || !form.link.trim() || !form.price.trim() || sending) return;
    setSending(true);
    const wish = await createWish(user.id, user.partner_id, {
      text: form.text.trim(),
      description: form.description.trim(),
      link: form.link.trim(),
      price: form.price.trim(),
      photoBase64: form.photo,
    });
    if (wish) {
      setWishes(prev => [wish, ...prev]);
      setForm({ text: '', description: '', link: '', price: '', photo: null });
      setPhotoPreview(null);
      setShowAdd(false);
      setSnack({ open: true, message: 'Желание добавлено', type: 'success' });
    }
    setSending(false);
  };

  const handleToggle = async (wish) => {
    const updated = await toggleWishCompleted(wish.id, !wish.is_completed);
    if (updated) {
      setWishes(prev => prev.map(w => w.id === wish.id ? { ...w, is_completed: updated.is_completed } : w));
    }
  };

  const openEdit = (wish) => {
    setEditingWish(wish);
    setForm({ text: wish.text, description: wish.description || '', link: wish.link || '', price: wish.price || '', photo: null });
    setPhotoPreview(wish.photo_url || null);
    setSelectedWish(null);
    setShowAdd(true);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!form.text.trim() || !form.link.trim() || !form.price.trim() || sending) return;
    setSending(true);
    const updated = await updateWish(editingWish.id, {
      text: form.text.trim(),
      description: form.description.trim(),
      link: form.link.trim(),
      price: form.price.trim(),
      photoBase64: form.photo,
    });
    if (updated) {
      setWishes(prev => prev.map(w => w.id === editingWish.id ? updated : w));
      setForm({ text: '', description: '', link: '', price: '', photo: null });
      setPhotoPreview(null);
      setEditingWish(null);
      setShowAdd(false);
      setSnack({ open: true, message: 'Желание обновлено', type: 'success' });
    }
    setSending(false);
  };

  const handleDelete = async (wishId) => {
    const ok = await deleteWish(wishId);
    if (ok) {
      setWishes(prev => prev.filter(w => w.id !== wishId));
      setSelectedWish(null);
      setSnack({ open: true, message: 'Удалено', type: 'error' });
    }
  };

  if (!user) return null;

  const currentList = tab === 0 ? myWishes : partnerWishes;

  return (
    <Box sx={{ minHeight: '100dvh', background: '#050505', pb: 8 }}>
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
              Желания
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

      <Box sx={{ maxWidth: 600, mx: 'auto', px: { xs: 2, sm: 3 }, pt: 2 }}>
        <Box sx={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)', mb: 2 }}>
          {['Мои желания', `Желания ${partner?.display_name || 'партнёра'}`].map((label, i) => (
            <Box
              key={i}
              onClick={() => setTab(i)}
              sx={{
                flex: 1, textAlign: 'center', py: 1.2, cursor: 'pointer',
                fontSize: '0.8rem', letterSpacing: '0.05em',
                color: tab === i ? '#fff' : '#444',
                borderBottom: tab === i ? '1px solid #fff' : '1px solid transparent',
                transition: 'all 0.2s ease',
                '&:hover': { color: tab === i ? '#fff' : '#888' },
              }}
            >
              {label}
            </Box>
          ))}
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 8 }}>
            <CircularProgress size={28} sx={{ color: 'rgba(255,255,255,0.3)' }} />
          </Box>
        ) : currentList.length === 0 ? (
          <Typography sx={{ textAlign: 'center', color: '#333', py: 6, fontSize: '0.85rem' }}>
            {tab === 0 ? 'У вас пока нет желаний' : 'Партнёр пока не добавил желания'}
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {currentList.map((wish, i) => (
              <Box
                key={wish.id}
                onClick={() => setSelectedWish(wish)}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5,
                  bgcolor: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: 3, overflow: 'hidden',
                  cursor: 'pointer', p: 1,
                  animation: `fadeIn 0.3s ease ${i * 0.05}s backwards`,
                  transition: 'all 0.2s ease',
                  opacity: wish.is_completed ? 0.5 : 1,
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' },
                }}
              >
                {wish.photo_url ? (
                  <Box
                    component="img"
                    src={wish.photo_url}
                    alt=""
                    sx={{ width: 56, height: 56, borderRadius: 2, objectFit: 'cover', flexShrink: 0 }}
                  />
                ) : (
                  <Box sx={{
                    width: 56, height: 56, borderRadius: 2, flexShrink: 0,
                    bgcolor: 'rgba(255,255,255,0.03)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#333', fontSize: '1.4rem',
                  }}>
                    🎁
                  </Box>
                )}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{
                    fontSize: '0.85rem', color: wish.is_completed ? '#555' : '#e0e0e0',
                    textDecoration: wish.is_completed ? 'line-through' : 'none',
                    fontWeight: 500,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {wish.text}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.3 }}>
                    {wish.price && (
                      <Typography sx={{ fontSize: '0.75rem', color: '#4ade80', fontWeight: 500 }}>
                        {wish.price} ₽
                      </Typography>
                    )}
                    {wish.is_completed && (
                      <Typography sx={{ fontSize: '0.65rem', color: '#f59e0b', fontWeight: 500, letterSpacing: '0.02em' }}>
                        Забронировано
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
        )}

        {/* FAB for adding wish */}
        {tab === 0 && (
          <Box
            onClick={() => setShowAdd(true)}
            sx={{
              position: 'fixed', bottom: 28, left: 'calc(50% - 22px)',
              width: 44, height: 44, borderRadius: '50%',
              bgcolor: '#fff', color: '#050505',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 0 40px rgba(255,255,255,0.08)',
              transition: 'all 0.3s ease',
              '&:hover': { transform: 'scale(1.1)', boxShadow: '0 0 50px rgba(255,255,255,0.15)' },
            }}
          >
            <AddIcon />
          </Box>
        )}
      </Box>

      {/* Wish detail dialog */}
      <Dialog
        open={!!selectedWish}
        onClose={() => setSelectedWish(null)}
        PaperProps={{
          sx: {
            p: 0, width: '100%', maxWidth: 420, borderRadius: 4, overflow: 'hidden',
            bgcolor: '#111', m: 2,
          }
        }}
      >
        {selectedWish && (
          <>
            <Box sx={{ position: 'relative' }}>
              {selectedWish.photo_url ? (
                <Box
                  component="img"
                  src={selectedWish.photo_url}
                  alt=""
                  sx={{ width: '100%', aspectRatio: '1', objectFit: 'cover' }}
                />
              ) : (
                <Box sx={{
                  width: '100%', aspectRatio: '1',
                  bgcolor: 'rgba(255,255,255,0.03)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#333', fontSize: '4rem',
                }}>
                  🎁
                </Box>
              )}
              <IconButton
                onClick={() => setSelectedWish(null)}
                sx={{
                  position: 'absolute', top: 8, right: 8,
                  bgcolor: 'rgba(0,0,0,0.5)', color: '#fff',
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
                  width: 32, height: 32,
                }}
              >
                <CloseIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Box>
            <Box sx={{ p: '16px 20px' }}>
              <Typography sx={{
                fontSize: '1.1rem', color: selectedWish.is_completed ? '#555' : '#fff',
                textDecoration: selectedWish.is_completed ? 'line-through' : 'none',
                fontWeight: 600, mb: 0.5,
              }}>
                {selectedWish.text}
              </Typography>
              {selectedWish.description && (
                <Typography sx={{ fontSize: '0.8rem', color: '#888', mt: 0.5, lineHeight: 1.5 }}>
                  {selectedWish.description}
                </Typography>
              )}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2 }}>
                {selectedWish.price && (
                  <Typography sx={{ fontSize: '1rem', color: '#4ade80', fontWeight: 600 }}>
                    {selectedWish.price} ₽
                  </Typography>
                )}
                {selectedWish.link && (
                  <Box
                    component="a"
                    href={selectedWish.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      display: 'flex', alignItems: 'center', gap: 0.5,
                      fontSize: '0.8rem', color: '#888',
                      textDecoration: 'none', py: 0.8, px: 1.5,
                      border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2,
                      '&:hover': { color: '#fff', borderColor: 'rgba(255,255,255,0.25)' },
                    }}
                  >
                    <LinkIcon sx={{ fontSize: 16 }} />
                    Перейти
                  </Box>
                )}
              </Box>
              {tab === 0 && (
                <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                  <Button
                    onClick={() => openEdit(selectedWish)}
                    fullWidth
                    sx={{
                      py: 1, borderRadius: '10px',
                      color: '#888', border: '1px solid rgba(255,255,255,0.1)',
                      fontSize: '0.8rem', fontWeight: 500,
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.25)' },
                    }}
                  >
                    <EditIcon sx={{ fontSize: 16, mr: 0.5 }} />
                    Изменить
                  </Button>
                  <Button
                    onClick={() => handleDelete(selectedWish.id)}
                    fullWidth
                    sx={{
                      py: 1, borderRadius: '10px',
                      color: '#ff5050', border: '1px solid rgba(255,60,60,0.2)',
                      fontSize: '0.8rem', fontWeight: 500,
                      '&:hover': { bgcolor: 'rgba(255,60,60,0.08)', borderColor: 'rgba(255,60,60,0.4)' },
                    }}
                  >
                    <DeleteOutlineIcon sx={{ fontSize: 16, mr: 0.5 }} />
                    Удалить
                  </Button>
                </Box>
              )}
              {tab === 1 && (
                <Button
                  onClick={() => {
                    handleToggle(selectedWish);
                    setSelectedWish(prev => prev ? { ...prev, is_completed: !prev.is_completed } : null);
                  }}
                  fullWidth
                  sx={{
                    mt: 2, py: 1, borderRadius: '10px',
                    fontSize: '0.8rem', fontWeight: 500,
                    color: selectedWish.is_completed ? '#888' : '#f59e0b',
                    border: selectedWish.is_completed ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(245,158,11,0.3)',
                    '&:hover': {
                      bgcolor: selectedWish.is_completed ? 'rgba(255,255,255,0.05)' : 'rgba(245,158,11,0.08)',
                      borderColor: selectedWish.is_completed ? 'rgba(255,255,255,0.2)' : 'rgba(245,158,11,0.5)',
                    },
                  }}
                >
                  {selectedWish.is_completed ? 'Снять бронь' : 'Забронировать'}
                </Button>
              )}
            </Box>
          </>
        )}
      </Dialog>

      {/* Add wish dialog */}
      <Dialog
        open={showAdd}
        onClose={() => { setShowAdd(false); setEditingWish(null); setForm({ text: '', description: '', link: '', price: '', photo: null }); setPhotoPreview(null); }}
        PaperProps={{ sx: { p: 3, width: '100%', maxWidth: 420 } }}
      >
        <DialogTitle sx={{ p: 0, mb: 0.5, color: '#fff', fontWeight: 300, letterSpacing: '0.05em', fontSize: '1.15rem' }}>
          {editingWish ? 'Редактировать' : 'Новое желание'}
        </DialogTitle>
        <DialogContent sx={{ p: '0 !important' }}>
          <Typography sx={{ color: '#333', fontSize: '0.8rem', mb: 2 }}>
            {editingWish ? 'Измените данные желания' : 'Расскажите партнёру, чего вы хотите'}
          </Typography>
          <Box component="form" onSubmit={editingWish ? handleEdit : handleAdd}>
            <TextField
              placeholder="Название"
              value={form.text}
              onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
              required
              sx={{ mb: 1.5 }}
            />
            <TextField
              placeholder="Описание (необязательно)"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              multiline
              rows={2}
              sx={{ mb: 1.5 }}
            />
            <TextField
              placeholder="Ссылка"
              value={form.link}
              onChange={e => setForm(f => ({ ...f, link: e.target.value }))}
              required
              sx={{ mb: 1.5 }}
            />
            <TextField
              placeholder="Цена"
              value={form.price}
              onChange={e => {
                const val = e.target.value;
                if (val === '' || /^\d+$/.test(val)) setForm(f => ({ ...f, price: val }));
              }}
              inputMode="numeric"
              required
              sx={{ mb: 1.5 }}
            />
            <Box sx={{ mb: 1.5 }}>
              {photoPreview && (
                <Box sx={{ position: 'relative', mb: 1 }}>
                  <Box component="img" src={photoPreview} alt="" sx={{
                    width: '100%', height: 160, objectFit: 'cover', borderRadius: 2,
                  }} />
                  <Box
                    onClick={() => { setForm(f => ({ ...f, photo: null })); setPhotoPreview(null); }}
                    sx={{
                      position: 'absolute', top: 6, right: 6,
                      width: 24, height: 24, borderRadius: '50%',
                      bgcolor: 'rgba(0,0,0,0.7)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.75rem', color: '#fff',
                      '&:hover': { bgcolor: 'rgba(255,60,60,0.8)' },
                    }}
                  >
                    ✕
                  </Box>
                </Box>
              )}
              {!photoPreview && (
                <Box component="label" sx={{ display: 'block', cursor: 'pointer' }}>
                  <Box sx={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1,
                    p: 3, border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 3,
                    color: '#333', fontSize: '0.85rem',
                    transition: 'all 0.3s ease',
                    '&:hover': { borderColor: 'rgba(255,255,255,0.2)', color: '#888' },
                  }}>
                    + Добавить фото
                  </Box>
                  <input type="file" accept="image/*" onChange={handlePhoto} hidden />
                </Box>
              )}
            </Box>
            <Button type="submit" fullWidth variant="contained" disabled={sending || !form.text.trim() || !form.link.trim() || !form.price.trim()}
              sx={{
                py: 1.5, borderRadius: '12px', background: '#fff', color: '#050505', fontWeight: 600,
                '&:hover': { background: '#fff', boxShadow: '0 8px 30px rgba(255,255,255,0.12)' },
                '&:disabled': { opacity: 0.4, background: '#fff', color: '#050505' },
              }}
            >
              {sending ? '...' : editingWish ? 'Сохранить' : 'Добавить'}
            </Button>
          </Box>
        </DialogContent>
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={2000}
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
