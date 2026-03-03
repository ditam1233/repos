import { Link } from 'react-router-dom';
import { Box, Typography, Button, Divider } from '@mui/material';

export default function Landing() {
  return (
    <Box sx={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#050505',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background orbs */}
      <Box sx={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <Box sx={{
          position: 'absolute', borderRadius: '50%', filter: 'blur(80px)', opacity: 0.07,
          width: 500, height: 500, background: '#fff', top: '-10%', right: '-5%',
          animation: 'glow 8s ease-in-out infinite',
        }} />
        <Box sx={{
          position: 'absolute', borderRadius: '50%', filter: 'blur(80px)', opacity: 0.07,
          width: 400, height: 400, background: '#888', bottom: '-15%', left: '-10%',
          animation: 'glow 10s ease-in-out infinite 2s',
        }} />
        <Box sx={{
          position: 'absolute', borderRadius: '50%', filter: 'blur(80px)', opacity: 0.07,
          width: 200, height: 200, background: '#fff', top: '40%', left: '30%',
          animation: 'glow 6s ease-in-out infinite 4s',
        }} />
      </Box>

      {/* Content */}
      <Box sx={{ textAlign: 'center', position: 'relative', zIndex: 1, px: 3 }}>
        <Typography sx={{
          fontSize: 'clamp(3rem, 10vw, 6rem)',
          mb: 0.5, fontWeight: 100, letterSpacing: '0.25em',
          textTransform: 'uppercase', color: '#fff', lineHeight: 1.1,
          animation: 'fadeIn 1s ease',
        }}>
          Moments
        </Typography>
        <Divider sx={{
          width: 40, mx: 'auto', my: 2,
          borderColor: 'rgba(255,255,255,0.2)',
          animation: 'fadeIn 1.2s ease',
        }} />
        <Typography sx={{
          fontSize: 'clamp(0.85rem, 2.5vw, 1.05rem)',
          color: '#555', mb: 4, letterSpacing: '0.08em', fontWeight: 300,
          animation: 'fadeIn 1.3s ease',
        }}>
          Сохраняйте особенные моменты вместе
        </Typography>
        <Button
          component={Link}
          to="/auth"
          variant="contained"
          sx={{
            animation: 'fadeIn 1.5s ease',
            px: 6, py: 1.5,
            fontSize: '0.85rem', letterSpacing: '0.15em', textTransform: 'uppercase',
            borderRadius: 50, background: '#fff', color: '#050505', fontWeight: 600,
            '&:hover': {
              background: '#fff',
              boxShadow: '0 8px 30px rgba(255,255,255,0.12)',
              transform: 'translateY(-2px)',
            },
          }}
        >
          Начать
        </Button>
      </Box>
    </Box>
  );
}
