import { useState, useRef } from 'react';
import { Box, IconButton } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

export default function PhotoCarousel({ photos, height = 400, onPhotoClick }) {
  const [current, setCurrent] = useState(0);
  const touchStart = useRef(null);

  if (!photos || photos.length === 0) return null;
  if (photos.length === 1) {
    return (
      <Box
        component="img"
        src={photos[0]}
        alt=""
        onClick={() => onPhotoClick?.(photos[0])}
        sx={{
          width: '100%', maxHeight: height, objectFit: 'cover', display: 'block',
          cursor: onPhotoClick ? 'zoom-in' : 'default',
        }}
      />
    );
  }

  const prev = () => setCurrent(i => (i - 1 + photos.length) % photos.length);
  const next = () => setCurrent(i => (i + 1) % photos.length);

  const handleTouchStart = (e) => { touchStart.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (touchStart.current === null) return;
    const diff = touchStart.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) { diff > 0 ? next() : prev(); }
    touchStart.current = null;
  };

  return (
    <Box sx={{ position: 'relative', overflow: 'hidden' }}
      onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}
    >
      <Box sx={{
        display: 'flex',
        transform: `translateX(-${current * 100}%)`,
        transition: 'transform 0.3s ease',
      }}>
        {photos.map((url, i) => (
          <Box
            key={i}
            component="img"
            src={url}
            alt=""
            onClick={() => onPhotoClick?.(url)}
            sx={{
              width: '100%', maxHeight: height, objectFit: 'cover',
              flexShrink: 0, cursor: onPhotoClick ? 'zoom-in' : 'default',
            }}
          />
        ))}
      </Box>

      {/* Arrows */}
      <IconButton onClick={prev} sx={{
        position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
        bgcolor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.1)',
        color: '#ccc', width: 32, height: 32,
        '&:hover': { bgcolor: 'rgba(0,0,0,0.7)', color: '#fff' },
      }}>
        <ChevronLeftIcon fontSize="small" />
      </IconButton>
      <IconButton onClick={next} sx={{
        position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
        bgcolor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.1)',
        color: '#ccc', width: 32, height: 32,
        '&:hover': { bgcolor: 'rgba(0,0,0,0.7)', color: '#fff' },
      }}>
        <ChevronRightIcon fontSize="small" />
      </IconButton>

      {/* Dots */}
      <Box sx={{
        position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: 0.75,
      }}>
        {photos.map((_, i) => (
          <Box key={i} onClick={() => setCurrent(i)} sx={{
            width: 6, height: 6, borderRadius: '50%', cursor: 'pointer',
            bgcolor: i === current ? '#fff' : 'rgba(255,255,255,0.35)',
            transition: 'all 0.2s ease',
          }} />
        ))}
      </Box>
    </Box>
  );
}
