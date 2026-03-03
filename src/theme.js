import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#050505',
      paper: '#0c0c0c',
    },
    text: {
      primary: '#e0e0e0',
      secondary: '#555',
    },
    primary: {
      main: '#fff',
    },
    error: {
      main: '#ff5050',
    },
  },
  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 10,
          fontWeight: 600,
          letterSpacing: '0.02em',
          transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
        fullWidth: true,
      },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            background: 'rgba(255,255,255,0.03)',
            '& fieldset': {
              borderColor: 'rgba(255,255,255,0.06)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(255,255,255,0.15)',
            },
            '&.Mui-focused fieldset': {
              borderColor: 'rgba(255,255,255,0.15)',
              borderWidth: 1,
            },
            '&.Mui-focused': {
              background: 'rgba(255,255,255,0.05)',
            },
          },
          '& .MuiInputBase-input': {
            color: '#e0e0e0',
            fontSize: '0.95rem',
          },
          '& .MuiInputBase-input::placeholder': {
            color: '#3a3a3a',
            opacity: 1,
          },
          '& .MuiInputLabel-root': {
            color: '#3a3a3a',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: 20,
          backdropFilter: 'blur(40px)',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          background: '#0c0c0c',
          borderRadius: 20,
          border: '1px solid rgba(255,255,255,0.05)',
        },
        backdrop: {
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(12px)',
        },
      },
    },
  },
});

export default theme;
