import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { registerUser, loginUser } from '../utils/storage';
import { Box, Card, CardContent, TextField, Button, Typography, Alert } from '@mui/material';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password.trim() || (!isLogin && !displayName.trim())) {
      setError('Заполните все поля');
      return;
    }
    setLoading(true);
    const result = isLogin
      ? await loginUser(username, password)
      : await registerUser(username, password, displayName);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      login(result.user);
      navigate('/home');
    }
  };

  return (
    <Box sx={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#050505',
      p: 3,
      position: 'relative',
      overflow: 'hidden',
      '&::before': {
        content: '""',
        position: 'absolute',
        width: 400, height: 400,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.02)',
        filter: 'blur(80px)',
        top: -100, right: -100,
      },
    }}>
      <Card sx={{
        p: { xs: '2rem 1.5rem', sm: '2.5rem 2rem' },
        width: '100%',
        maxWidth: 380,
        animation: 'fadeInScale 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        <CardContent sx={{ p: '0 !important' }}>
          <Typography
            component={Link}
            to="/"
            sx={{
              display: 'inline-flex', alignItems: 'center', gap: 0.5,
              color: '#444', fontSize: '0.8rem', textDecoration: 'none', mb: 3,
              transition: 'color 0.3s', '&:hover': { color: '#fff' },
            }}
          >
            ← Назад
          </Typography>

          <Typography variant="h5" sx={{
            textAlign: 'center', mb: 0.5, color: '#fff', fontWeight: 200,
            letterSpacing: '0.15em', textTransform: 'uppercase', fontSize: '1.3rem',
          }}>
            {isLogin ? 'Вход' : 'Регистрация'}
          </Typography>
          <Typography sx={{ textAlign: 'center', color: '#333', fontSize: '0.8rem', mb: 3 }}>
            {isLogin ? 'С возвращением' : 'Создайте аккаунт'}
          </Typography>

          <Box component="form" onSubmit={handleSubmit}>
            {!isLogin && (
              <TextField
                placeholder="Ваше имя"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                sx={{ mb: 1.5 }}
              />
            )}
            <TextField
              placeholder="Имя пользователя"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
              sx={{ mb: 1.5 }}
            />
            <TextField
              type="password"
              placeholder="Пароль"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              sx={{ mb: 1.5 }}
            />
            {error && (
              <Alert severity="error" sx={{
                mb: 1.5, background: 'transparent', color: '#ff4444',
                p: '0 0 0 8px', '& .MuiAlert-icon': { color: '#ff4444' },
              }}>
                {error}
              </Alert>
            )}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{
                mt: 1, py: 1.5, borderRadius: '12px',
                background: '#fff', color: '#050505', fontWeight: 600,
                '&:hover': { background: '#fff', boxShadow: '0 8px 30px rgba(255,255,255,0.12)', transform: 'translateY(-2px)' },
                '&:disabled': { opacity: 0.4, background: '#fff', color: '#050505' },
              }}
            >
              {loading ? '...' : isLogin ? 'Войти' : 'Создать аккаунт'}
            </Button>
          </Box>

          <Typography
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            sx={{
              textAlign: 'center', mt: 2, color: '#333', cursor: 'pointer',
              fontSize: '0.82rem', transition: 'color 0.3s', '&:hover': { color: '#aaa' },
            }}
          >
            {isLogin ? 'Нет аккаунта? Зарегистрируйтесь' : 'Уже есть аккаунт? Войдите'}
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
