import { useState, useEffect } from 'react';
import { Card, CardActionArea, CardMedia, CardContent, Typography, Chip, Dialog, DialogTitle, DialogContent, IconButton, Box, Modal, Button, TextField, Avatar } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SendIcon from '@mui/icons-material/Send';
import { getComments, addComment, deleteComment, getReactions, toggleReaction, getMomentPhotos } from '../utils/storage';
import PhotoCarousel from './PhotoCarousel';

const EMOJI_LIST = ['❤️', '🔥', '😍', '😂', '🥺', '👏'];

export default function MomentCard({ moment, onDelete, currentUserId }) {
  const [open, setOpen] = useState(false);
  const [fullPhoto, setFullPhoto] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [comments, setComments] = useState([]);
  const [reactions, setReactions] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [photos, setPhotos] = useState([]);

  const formattedDate = new Date(moment.date).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  useEffect(() => {
    if (open) {
      getReactions(moment.id).then(setReactions);
      getComments(moment.id).then(setComments);
      getMomentPhotos(moment.id).then(p => setPhotos(p.map(x => x.photo_url)));
    }
  }, [open, moment.id]);

  const handleToggleReaction = async (emoji) => {
    const result = await toggleReaction(moment.id, currentUserId, emoji);
    if (result === 'limit') return;
    const updated = await getReactions(moment.id);
    setReactions(updated);
    setShowEmojiPicker(false);
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    setSendingComment(true);
    const c = await addComment(moment.id, currentUserId, commentText.trim());
    if (c) setComments(prev => [...prev, c]);
    setCommentText('');
    setSendingComment(false);
  };

  const handleDeleteComment = async (id) => {
    await deleteComment(id);
    setComments(prev => prev.filter(c => c.id !== id));
  };

  const getEmojiCount = (emoji) => reactions.filter(r => r.emoji === emoji).length;
  const hasMyReaction = (emoji) => reactions.some(r => r.emoji === emoji && r.author_id === currentUserId);

  return (
    <>
      <Card sx={{
        cursor: 'pointer',
        bgcolor: 'rgba(255,255,255,0.02)',
        borderRadius: 4,
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.04)',
        transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        animation: 'fadeIn 0.6s ease backwards',
        '&:hover': {
          transform: 'translateY(-6px)',
          borderColor: 'rgba(255,255,255,0.08)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
          bgcolor: 'rgba(255,255,255,0.03)',
          '& .moment-photo': { opacity: 1, transform: 'scale(1.02)' },
        },
      }}>
        <CardActionArea onClick={() => setOpen(true)} sx={{ '&:hover .MuiCardActionArea-focusHighlight': { opacity: 0 } }}>
          {moment.photo_url && (
            <Box sx={{ position: 'relative', overflow: 'hidden' }}>
              <Chip label={formattedDate} size="small" sx={{
                position: 'absolute', top: 10, left: 12, zIndex: 2,
                fontSize: '0.65rem', color: '#fff', letterSpacing: '0.1em',
                bgcolor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
                textTransform: 'uppercase', height: 24,
              }} />
              <CardMedia
                component="img"
                image={moment.photo_url}
                alt={moment.title}
                className="moment-photo"
                sx={{
                  height: { xs: 200, sm: 240 },
                  objectFit: 'cover',
                  opacity: 0.85,
                  transition: 'all 0.5s ease',
                }}
              />
            </Box>
          )}
          <CardContent sx={{ p: moment.photo_url ? '18px 20px 20px' : '24px 20px' }}>
            {!moment.photo_url && (
              <Typography sx={{ fontSize: '0.65rem', color: '#333', letterSpacing: '0.1em', textTransform: 'uppercase', mb: 1 }}>
                {formattedDate}
              </Typography>
            )}
            <Typography sx={{ fontSize: '1.05rem', color: '#e0e0e0', fontWeight: 500, letterSpacing: '0.01em', lineHeight: 1.3, mb: moment.description ? 1 : 0 }}>
              {moment.title}
            </Typography>
            {moment.description && (
              <Typography sx={{ fontSize: '0.85rem', color: '#555', lineHeight: 1.65 }}>
                {moment.description}
              </Typography>
            )}
          </CardContent>
        </CardActionArea>
      </Card>

      {/* View moment dialog */}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#0c0c0c',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 5,
            maxHeight: '90vh',
            overflow: 'hidden',
          },
        }}
      >
        <Box sx={{ position: 'relative', overflowY: 'auto', maxHeight: '90vh' }}>
          <Box sx={{ position: 'absolute', top: 12, right: 12, zIndex: 3, display: 'flex', gap: 1 }}>
            {onDelete && (
              <IconButton onClick={() => setConfirmDelete(true)} sx={{
                bgcolor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#aaa', width: 32, height: 32,
                '&:hover': { color: '#ff5050', bgcolor: 'rgba(255,0,0,0.15)' },
              }}>
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            )}
            <IconButton onClick={() => setOpen(false)} sx={{
              bgcolor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#aaa', width: 32, height: 32,
              '&:hover': { color: '#fff', bgcolor: 'rgba(0,0,0,0.7)' },
            }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
          {(photos.length > 0 || moment.photo_url) && (
            <PhotoCarousel
              photos={photos.length > 0 ? photos : [moment.photo_url]}
              onPhotoClick={(url) => setFullPhoto(url)}
            />
          )}
          <Box sx={{ p: 3 }}>
            <Typography sx={{ fontSize: '0.72rem', color: '#444', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {formattedDate}
            </Typography>
            <Typography sx={{ mt: 1, mb: 1.5, fontSize: '1.3rem', color: '#fff', fontWeight: 400, letterSpacing: '0.02em', lineHeight: 1.35 }}>
              {moment.title}
            </Typography>
            {moment.description && (
              <Typography sx={{ fontSize: '0.9rem', color: '#777', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {moment.description}
              </Typography>
            )}

            {/* Reactions */}
            {(() => {
              const myReaction = reactions.find(r => r.author_id === currentUserId);
              const otherEmojis = EMOJI_LIST.filter(e => e !== '❤️');
              const pickerEmojis = myReaction ? EMOJI_LIST : otherEmojis;
              return (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2.5 }}>
                  {/* Existing reactions display */}
                  {reactions.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {EMOJI_LIST.filter(emoji => getEmojiCount(emoji) > 0).map(emoji => (
                        <Box
                          key={emoji}
                          onClick={() => handleToggleReaction(emoji)}
                          sx={{
                            display: 'flex', alignItems: 'center', gap: 0.4,
                            px: 1, py: 0.4, borderRadius: 2, cursor: 'pointer', userSelect: 'none',
                            bgcolor: hasMyReaction(emoji) ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${hasMyReaction(emoji) ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)'}`,
                            transition: 'all 0.2s ease',
                            '&:hover': { transform: 'scale(1.08)' },
                          }}
                        >
                          <span style={{ fontSize: '0.9rem' }}>{emoji}</span>
                          <Typography sx={{ fontSize: '0.68rem', color: hasMyReaction(emoji) ? '#fff' : '#555', fontWeight: 500 }}>
                            {getEmojiCount(emoji)}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  )}

                  {/* Heart button + emoji picker */}
                  <Box
                    sx={{ position: 'relative' }}
                    onMouseEnter={() => setShowEmojiPicker(true)}
                    onMouseLeave={() => setShowEmojiPicker(false)}
                  >
                    <Box
                      onClick={() => handleToggleReaction('❤️')}
                      sx={{
                        width: 32, height: 32, borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', userSelect: 'none',
                        bgcolor: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        transition: 'all 0.2s ease',
                        fontSize: '0.95rem',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.08)', transform: 'scale(1.1)' },
                      }}
                    >
                      ❤️
                    </Box>

                    {/* Emoji picker popup — opens to the right, with bridge for hover gap */}
                    {showEmojiPicker && (
                      <Box sx={{
                        position: 'absolute', left: '100%', top: '50%', transform: 'translateY(-50%)',
                        pl: 0.5,
                        zIndex: 10,
                      }}>
                        <Box sx={{
                          display: 'flex', gap: 0.25, p: 0.5,
                          bgcolor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 3, boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                          animation: 'fadeInScale 0.15s ease',
                        }}>
                          {pickerEmojis.map(emoji => (
                            <Box
                              key={emoji}
                              onClick={() => handleToggleReaction(emoji)}
                              sx={{
                                width: 34, height: 34, borderRadius: 2,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', fontSize: '1.1rem',
                                transition: 'all 0.15s ease',
                                bgcolor: hasMyReaction(emoji) ? 'rgba(255,255,255,0.12)' : 'transparent',
                                '&:hover': { bgcolor: 'rgba(255,255,255,0.1)', transform: 'scale(1.2)' },
                              }}
                            >
                              {emoji}
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    )}
                  </Box>
                </Box>
              );
            })()}

            {/* Comments */}
            <Box sx={{ mt: 3, borderTop: '1px solid rgba(255,255,255,0.05)', pt: 2 }}>
              <Typography sx={{ fontSize: '0.7rem', color: '#444', letterSpacing: '0.1em', textTransform: 'uppercase', mb: 1.5 }}>
                Комментарии{comments.length > 0 ? ` (${comments.length})` : ''}
              </Typography>

              {comments.length === 0 && (
                <Typography sx={{ fontSize: '0.8rem', color: '#333', mb: 2 }}>
                  Пока нет комментариев
                </Typography>
              )}

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
                {comments.map(c => (
                  <Box key={c.id} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                    <Avatar
                      src={c.profiles?.avatar_url}
                      sx={{ width: 28, height: 28, bgcolor: 'rgba(255,255,255,0.08)', fontSize: '0.7rem', mt: 0.25 }}
                    >
                      {(c.profiles?.display_name || c.profiles?.username || '?').charAt(0).toUpperCase()}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography sx={{ fontSize: '0.75rem', color: '#666', fontWeight: 500 }}>
                          {c.profiles?.display_name || c.profiles?.username}
                        </Typography>
                        <Typography sx={{ fontSize: '0.65rem', color: '#333' }}>
                          {new Date(c.created_at).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                        {c.author_id === currentUserId && (
                          <IconButton
                            onClick={() => handleDeleteComment(c.id)}
                            sx={{ ml: 'auto', p: 0.25, color: '#333', '&:hover': { color: '#ff5050' } }}
                          >
                            <CloseIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        )}
                      </Box>
                      <Typography sx={{ fontSize: '0.85rem', color: '#ccc', lineHeight: 1.5, wordBreak: 'break-word' }}>
                        {c.text}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>

              {/* Add comment */}
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                <TextField
                  placeholder="Написать комментарий..."
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
                  multiline
                  maxRows={3}
                  size="small"
                  sx={{ flex: 1 }}
                />
                <IconButton
                  onClick={handleAddComment}
                  disabled={sendingComment || !commentText.trim()}
                  sx={{
                    color: commentText.trim() ? '#fff' : '#333',
                    transition: 'color 0.2s ease',
                    mb: 0.5,
                  }}
                >
                  <SendIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
          </Box>
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
          <Box
            component="img"
            src={fullPhoto}
            alt={moment.title}
            sx={{ maxWidth: '95vw', maxHeight: '95vh', objectFit: 'contain', borderRadius: 1 }}
          />
        </Box>
      </Modal>

      {/* Confirm delete */}
      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)} PaperProps={{
        sx: { p: 3, maxWidth: 340, bgcolor: '#0c0c0c', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 4 },
      }}>
        <DialogTitle sx={{ p: 0, mb: 1, color: '#fff', fontWeight: 300, fontSize: '1.1rem' }}>
          Удалить момент?
        </DialogTitle>
        <DialogContent sx={{ p: '0 !important' }}>
          <Typography sx={{ color: '#555', fontSize: '0.85rem', mb: 3 }}>
            Это действие нельзя отменить
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button fullWidth onClick={() => setConfirmDelete(false)} sx={{
              py: 1.2, borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)',
              color: '#aaa', fontSize: '0.85rem', textTransform: 'none',
              '&:hover': { borderColor: 'rgba(255,255,255,0.2)', color: '#fff' },
            }}>
              Отмена
            </Button>
            <Button fullWidth disabled={deleting} onClick={async () => {
              setDeleting(true);
              await onDelete(moment.id);
              setDeleting(false);
              setConfirmDelete(false);
              setOpen(false);
            }} sx={{
              py: 1.2, borderRadius: 3,
              bgcolor: 'rgba(255,60,60,0.12)', border: '1px solid rgba(255,60,60,0.2)',
              color: '#ff5050', fontSize: '0.85rem', textTransform: 'none',
              '&:hover': { bgcolor: 'rgba(255,60,60,0.2)', borderColor: 'rgba(255,60,60,0.4)' },
              '&:disabled': { opacity: 0.4 },
            }}>
              {deleting ? '...' : 'Удалить'}
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
}
