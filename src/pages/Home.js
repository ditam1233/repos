import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getPairMoments, createMoment, linkPartner, getUser, deleteMoment, updatePairedAt } from '../utils/storage';
import MomentCard from '../components/MomentCard';
import {
  Box, AppBar, Toolbar, Typography, Avatar, MenuItem, Fab,
  Dialog, DialogTitle, DialogContent, TextField, Button, IconButton,
  CircularProgress, Snackbar,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import AddIcon from '@mui/icons-material/Add';
import TimelineIcon from '@mui/icons-material/ViewTimeline';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import Calendar from '../components/Calendar';

export default function Home() {
  const { user, logout, refresh } = useAuth();
  const navigate = useNavigate();
  const [moments, setMoments] = useState([]);
  const [momentsLoading, setMomentsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showPair, setShowPair] = useState(false);
  const [partnerCode, setPartnerCode] = useState('');
  const [pairError, setPairError] = useState('');
  const [form, setForm] = useState({ title: '', description: '', date: '', photos: [] });
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [copied, setCopied] = useState(false);
  const [partner, setPartner] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [snack, setSnack] = useState({ open: false, message: '', type: 'success' });
  const [showCalendar, setShowCalendar] = useState(false);
  const [showEditDate, setShowEditDate] = useState(false);
  const [editDate, setEditDate] = useState('');
  const [calendarMoment, setCalendarMoment] = useState(null);
  const [cachedAvatar, setCachedAvatar] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('avatar_cache') || null;
    }
    return null;
  });

  useEffect(() => {
    const url = user?.avatar_url;
    if (url && url !== cachedAvatar) {
      const img = new Image();
      img.onload = () => {
        sessionStorage.setItem('avatar_cache', url);
        setCachedAvatar(url);
      };
      img.src = url;
    }
  }, [user?.avatar_url]);

  const loadMoments = useCallback(async () => {
    if (!user) return;
    setMomentsLoading(true);
    const data = await getPairMoments(user.id);
    setMoments(data);
    setMomentsLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    loadMoments();
    if (user.partner_id) {
      getUser(user.partner_id).then(setPartner);
    }
  }, [user, navigate, loadMoments]);

  if (!user) return null;

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title || !form.date) return;
    setLoading(true);
    await createMoment(user.id, form.title, form.description, form.date, form.photos);
    setForm({ title: '', description: '', date: '', photos: [] });
    setPhotoPreviews([]);
    setShowCreate(false);
    setLoading(false);
    loadMoments();
    setSnack({ open: true, message: 'Момент создан ✓', type: 'success' });
  };

  const handlePhoto = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        setForm(f => ({ ...f, photos: [...f.photos, reader.result] }));
        setPhotoPreviews(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index) => {
    setForm(f => ({ ...f, photos: f.photos.filter((_, i) => i !== index) }));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handlePair = async () => {
    setPairError('');
    setLoading(true);
    const result = await linkPartner(user.id, partnerCode.toUpperCase());
    setLoading(false);
    if (result.error) { setPairError(result.error); return; }
    setPartnerCode('');
    setShowPair(false);
    await refresh();
    setPartner(result.partner);
    loadMoments();
  };

  const handleLogout = () => { navigate('/'); logout(); };

  return (
    <Box sx={{ minHeight: '100dvh', background: '#050505', pb: 12 }}>
      {/* Header */}
      <AppBar position="sticky" elevation={0} sx={{
        background: 'rgba(5,5,5,0.85)',
        backdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(255,255,255,0.03)',
        animation: 'fadeIn 0.4s ease',
      }}>
        <Toolbar sx={{ justifyContent: 'space-between', minHeight: '56px !important', px: { xs: 2, sm: 3 } }}>
          <Typography sx={{
            fontSize: '1rem', fontWeight: 200, letterSpacing: '0.2em',
            color: '#fff', textTransform: 'uppercase',
          }}>
            Moments
          </Typography>
          {user?.partner_id && partner && (
            <Typography sx={{
              position: 'absolute', left: '50%', transform: 'translateX(-50%)',
              color: '#444', fontSize: '0.78rem', letterSpacing: '0.03em',
              '& strong': { color: '#999', fontWeight: 500 },
            }}>
              Пара: <strong>{partner.display_name || partner.username}</strong>
            </Typography>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, animation: 'slideInRight 0.5s ease' }}>
            <IconButton onClick={() => setShowCalendar(true)} sx={{
              color: '#555', width: 36, height: 36,
              '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.06)' },
            }}>
              <CalendarMonthIcon fontSize="small" />
            </IconButton>
            <IconButton onClick={() => navigate('/timeline')} sx={{
              color: '#555', width: 36, height: 36,
              '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.06)' },
            }}>
              <TimelineIcon fontSize="small" />
            </IconButton>
          <Box
            sx={{ position: 'relative' }}
            onMouseEnter={() => setShowMenu(true)}
            onMouseLeave={() => setShowMenu(false)}
          >
            <Avatar
              src={cachedAvatar || user?.avatar_url || undefined}
              slotProps={{ img: { loading: 'eager', decoding: 'async' } }}
              onClick={() => navigate('/profile')}
              sx={{
                width: 36, height: 36, cursor: 'pointer',
                bgcolor: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#ccc', fontSize: '0.85rem', fontWeight: 400,
                transition: 'all 0.3s ease',
                '&:hover': { borderColor: 'rgba(255,255,255,0.25)', bgcolor: 'rgba(255,255,255,0.15)' },
              }}
            >
              {(user?.display_name || user?.username)?.charAt(0).toUpperCase()}
            </Avatar>
            {showMenu && (
              <Box sx={{
                position: 'absolute', top: '100%', right: 0, pt: 0.75, zIndex: 50,
              }}>
                <Box sx={{
                  bgcolor: '#111', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 3, p: 0.75, minWidth: 140,
                  animation: 'fadeInScale 0.2s ease',
                }}>
                  <MenuItem onClick={() => { setShowMenu(false); navigate('/profile'); }}
                    sx={{ color: '#aaa', fontSize: '0.82rem', borderRadius: 2, '&:hover': { bgcolor: 'rgba(255,255,255,0.06)', color: '#fff' } }}
                  >
                    Профиль
                  </MenuItem>
                </Box>
              </Box>
            )}
          </Box>
          </Box>
        </Toolbar>
      </AppBar>

      {/* No pair info */}
      {!user?.partner_id && (
        <Box sx={{ textAlign: 'center', pt: 4, pb: 2, px: 3, animation: 'fadeIn 0.6s ease' }}>
          <Typography sx={{ color: '#888', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.15em', mb: 2 }}>
            Ваш код
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, animation: 'fadeInScale 0.5s ease 0.2s backwards' }}>
            <Typography sx={{
              fontFamily: "'SF Mono', 'Fira Code', 'Courier New', monospace",
              fontSize: 'clamp(1.5rem, 5vw, 2.2rem)', color: '#fff',
              letterSpacing: '0.35em', fontWeight: 200,
              p: '14px 24px', background: 'rgba(255,255,255,0.06)',
              borderRadius: 3, border: '1px solid rgba(255,255,255,0.1)',
            }}>
              {user?.code}
            </Typography>
            <IconButton onClick={() => {
              navigator.clipboard.writeText(user?.code);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }} sx={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 3, p: 1.5, color: '#999',
              '&:hover': { borderColor: 'rgba(255,255,255,0.2)', color: '#fff' },
            }}>
              {copied ? <CheckIcon /> : <ContentCopyIcon />}
            </IconButton>
          </Box>
          <Button
            variant="contained"
            onClick={() => setShowPair(true)}
            sx={{
              mt: 2.5, px: 3, py: 0.8, fontSize: '0.8rem',
              background: '#fff', color: '#050505', fontWeight: 600,
              '&:hover': { background: '#fff', boxShadow: '0 8px 30px rgba(255,255,255,0.12)', transform: 'translateY(-2px)' },
            }}
          >
            Привязать пару
          </Button>
        </Box>
      )}

      {/* Pair dialog */}
      <Dialog open={showPair} onClose={() => setShowPair(false)} PaperProps={{ sx: { p: 3, width: '100%', maxWidth: 420 } }}>
        <DialogTitle sx={{ p: 0, mb: 0.5, color: '#fff', fontWeight: 300, letterSpacing: '0.05em', fontSize: '1.15rem' }}>
          Привязать пару
        </DialogTitle>
        <DialogContent sx={{ p: '0 !important' }}>
          <Typography sx={{ color: '#333', fontSize: '0.8rem', mb: 2 }}>
            Введите 6-символьный код вашего партнёра
          </Typography>
          <TextField
            placeholder="Код партнёра"
            value={partnerCode}
            onChange={e => setPartnerCode(e.target.value)}
            inputProps={{ maxLength: 6 }}
            sx={{ mb: 1.5 }}
          />
          {pairError && <Typography sx={{ color: '#ff4444', fontSize: '0.82rem', mb: 1.5, animation: 'fadeIn 0.3s ease' }}>{pairError}</Typography>}
          <Button fullWidth variant="contained" onClick={handlePair} disabled={loading}
            sx={{
              py: 1.5, borderRadius: '12px', background: '#fff', color: '#050505', fontWeight: 600,
              '&:hover': { background: '#fff', boxShadow: '0 8px 30px rgba(255,255,255,0.12)' },
              '&:disabled': { opacity: 0.4, background: '#fff', color: '#050505' },
            }}
          >
            {loading ? '...' : 'Связать'}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Days counter */}
      {user?.partner_id && user?.paired_at && (
        <Box
          onClick={() => { setEditDate(user.paired_at.slice(0, 10)); setShowEditDate(true); }}
          sx={{ textAlign: 'center', py: 1.5, cursor: 'pointer', animation: 'fadeIn 0.6s ease', '&:hover span': { color: '#bbb' } }}
        >
          <Typography sx={{ color: '#333', fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Вместе{' '}
            <Box component="span" sx={{ color: '#888', fontWeight: 500, transition: 'color 0.2s ease' }}>
              {Math.max(1, Math.floor((Date.now() - new Date(user.paired_at).getTime()) / 86400000))}
            </Box>
            {' '}
            {(() => {
              const d = Math.max(1, Math.floor((Date.now() - new Date(user.paired_at).getTime()) / 86400000));
              if (d % 10 === 1 && d % 100 !== 11) return 'день';
              if ([2,3,4].includes(d % 10) && ![12,13,14].includes(d % 100)) return 'дня';
              return 'дней';
            })()}
          </Typography>
        </Box>
      )}

      {/* Edit paired date dialog */}
      <Dialog open={showEditDate} onClose={() => setShowEditDate(false)} PaperProps={{ sx: { p: 3, width: '100%', maxWidth: 360 } }}>
        <DialogTitle sx={{ p: 0, mb: 0.5, color: '#fff', fontWeight: 300, letterSpacing: '0.05em', fontSize: '1.15rem' }}>
          Дата начала отношений
        </DialogTitle>
        <DialogContent sx={{ p: '0 !important' }}>
          <Typography sx={{ color: '#333', fontSize: '0.8rem', mb: 2 }}>
            Выберите дату, с которой начался ваш отсчёт
          </Typography>
          <TextField
            type="date"
            value={editDate}
            onChange={e => setEditDate(e.target.value)}
            sx={{ mb: 1.5, '& input': { colorScheme: 'dark' } }}
          />
          <Button fullWidth variant="contained" disabled={loading || !editDate} onClick={async () => {
            setLoading(true);
            await updatePairedAt(user.id, editDate);
            await refresh();
            setShowEditDate(false);
            setLoading(false);
            setSnack({ open: true, message: 'Дата обновлена ✓', type: 'success' });
          }} sx={{
            py: 1.5, borderRadius: '12px', background: '#fff', color: '#050505', fontWeight: 600,
            '&:hover': { background: '#fff', boxShadow: '0 8px 30px rgba(255,255,255,0.12)' },
            '&:disabled': { opacity: 0.4, background: '#fff', color: '#050505' },
          }}>
            {loading ? '...' : 'Сохранить'}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Calendar dialog */}
      <Dialog open={showCalendar} onClose={() => { setShowCalendar(false); setCalendarMoment(null); }} PaperProps={{ sx: { p: 3, width: '100%', maxWidth: 400 } }}>
        <DialogTitle sx={{ p: 0, mb: 1, color: '#fff', fontWeight: 300, letterSpacing: '0.05em', fontSize: '1.15rem' }}>
          Календарь
        </DialogTitle>
        <DialogContent sx={{ p: '0 !important' }}>
          {calendarMoment ? (
            <Box>
              <Box onClick={() => setCalendarMoment(null)} sx={{
                display: 'inline-flex', alignItems: 'center', gap: 0.5, cursor: 'pointer',
                color: '#555', fontSize: '0.75rem', mb: 1.5,
                '&:hover': { color: '#fff' },
              }}>
                ← Назад
              </Box>
              <MomentCard moment={calendarMoment} currentUserId={user.id} onDelete={async (id) => {
                await deleteMoment(id);
                await loadMoments();
                setCalendarMoment(null);
                setSnack({ open: true, message: 'Момент удалён', type: 'error' });
              }} />
            </Box>
          ) : (
            <Calendar moments={moments} onMomentClick={(m) => setCalendarMoment(m)} />
          )}
        </DialogContent>
      </Dialog>

      {/* FAB */}
      {user?.partner_id && (
        <Fab onClick={() => setShowCreate(true)} sx={{
          position: 'fixed', bottom: 28, left: 'calc(50% - 22px)',
          width: 44, height: 44, bgcolor: '#fff', color: '#050505',
          boxShadow: '0 0 40px rgba(255,255,255,0.08)',
          animation: 'scaleIn 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
          '&:hover': { bgcolor: '#fff', transform: 'scale(1.1)', boxShadow: '0 0 50px rgba(255,255,255,0.15)' },
        }}>
          <AddIcon />
        </Fab>
      )}

      {/* Create moment dialog */}
      <Dialog open={showCreate} onClose={() => { setShowCreate(false); setForm({ title: '', description: '', date: '', photos: [] }); setPhotoPreviews([]); }} PaperProps={{ sx: { p: 3, width: '100%', maxWidth: 420 } }}>
        <DialogTitle sx={{ p: 0, mb: 0.5, color: '#fff', fontWeight: 300, letterSpacing: '0.05em', fontSize: '1.15rem' }}>
          Новый момент
        </DialogTitle>
        <DialogContent sx={{ p: '0 !important' }}>
          <Typography sx={{ color: '#333', fontSize: '0.8rem', mb: 2 }}>
            Сохраните ваш особенный момент
          </Typography>
          <Box component="form" onSubmit={handleCreate}>
            <TextField
              placeholder="Название"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              required
              sx={{ mb: 1.5 }}
            />
            <TextField
              placeholder="Описание"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              multiline
              rows={3}
              sx={{ mb: 1.5 }}
            />
            <TextField
              type="date"
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              required
              sx={{ mb: 1.5, '& input': { colorScheme: 'dark' } }}
            />
            <Box sx={{ mb: 1.5 }}>
              {photoPreviews.length > 0 && (
                <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 1, mb: 1 }}>
                  {photoPreviews.map((src, i) => (
                    <Box key={i} sx={{ position: 'relative', flexShrink: 0 }}>
                      <Box component="img" src={src} alt="" sx={{
                        width: 80, height: 80, objectFit: 'cover', borderRadius: 2,
                        animation: 'fadeInScale 0.3s ease',
                      }} />
                      <Box
                        onClick={() => removePhoto(i)}
                        sx={{
                          position: 'absolute', top: -6, right: -6,
                          width: 20, height: 20, borderRadius: '50%',
                          bgcolor: 'rgba(255,60,60,0.85)', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.7rem', color: '#fff', lineHeight: 1,
                          '&:hover': { bgcolor: '#ff3030' },
                        }}
                      >
                        ✕
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
              <Box component="label" sx={{ display: 'block', cursor: 'pointer' }}>
                <Box sx={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1,
                  p: 3.5, border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 3,
                  color: '#333', fontSize: '0.85rem',
                  transition: 'all 0.3s ease',
                  '&:hover': { borderColor: 'rgba(255,255,255,0.2)', color: '#888', bgcolor: 'rgba(255,255,255,0.02)' },
                }}>
                  + Добавить фото
                </Box>
                <input type="file" accept="image/*" multiple onChange={handlePhoto} hidden />
              </Box>
            </Box>
            <Button type="submit" fullWidth variant="contained" disabled={loading}
              sx={{
                py: 1.5, borderRadius: '12px', background: '#fff', color: '#050505', fontWeight: 600,
                '&:hover': { background: '#fff', boxShadow: '0 8px 30px rgba(255,255,255,0.12)' },
                '&:disabled': { opacity: 0.4, background: '#fff', color: '#050505' },
              }}
            >
              {loading ? '...' : 'Сохранить'}
            </Button>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Moments grid */}
      <Box sx={{
        p: { xs: '8px 16px', sm: '8px 24px' },
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(auto-fill, minmax(280px, 1fr))', lg: 'repeat(3, 1fr)' },
        gap: { xs: 1.75, sm: 2.25 },
        maxWidth: { lg: 1100 },
        mx: 'auto',
      }}>
        {momentsLoading && (
          <Box sx={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 8 }}>
            <CircularProgress size={28} sx={{ color: 'rgba(255,255,255,0.3)' }} />
            <Typography sx={{ color: '#333', fontSize: '0.82rem', letterSpacing: '0.03em' }}>Загрузка моментов...</Typography>
          </Box>
        )}
        {!momentsLoading && moments.length === 0 && (
          <Typography sx={{ textAlign: 'center', color: '#222', gridColumn: '1 / -1', py: 8, fontSize: '0.85rem', letterSpacing: '0.03em' }}>
            {user?.partner_id ? 'Пока нет моментов. Создайте первый!' : 'Привяжите пару, чтобы начать сохранять моменты'}
          </Typography>
        )}
        {moments.map(m => (
          <MomentCard key={m.id} moment={m} currentUserId={user.id} onDelete={async (id) => { await deleteMoment(id); await loadMoments(); setSnack({ open: true, message: 'Момент удалён', type: 'error' }); }} />
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
            fontSize: '0.88rem',
            fontWeight: 300,
            letterSpacing: '0.03em',
            boxShadow: `0 8px 32px ${snack.type === 'success' ? 'rgba(40,180,80,0.15)' : 'rgba(255,60,60,0.15)'}`,
            minWidth: 'auto',
            px: 3, py: 1,
          },
        }}
        message={snack.message}
      />
    </Box>
  );
}
