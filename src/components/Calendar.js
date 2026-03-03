import { useState } from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

function getMonthDays(year, month) {
  const firstDay = new Date(year, month, 1);
  let startDay = firstDay.getDay() - 1;
  if (startDay < 0) startDay = 6;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return { startDay, daysInMonth };
}

function dateKey(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export default function Calendar({ moments, onMomentClick }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState(null);

  const momentsByDate = {};
  moments.forEach(m => {
    const d = m.date?.slice(0, 10);
    if (d) {
      if (!momentsByDate[d]) momentsByDate[d] = [];
      momentsByDate[d].push(m);
    }
  });

  const { startDay, daysInMonth } = getMonthDays(year, month);

  const prev = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
    setSelectedDay(null);
  };
  const next = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
    setSelectedDay(null);
  };

  const cells = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const selectedKey = selectedDay ? dateKey(year, month, selectedDay) : null;
  const selectedMoments = selectedKey ? (momentsByDate[selectedKey] || []) : [];

  const isToday = (d) => {
    return d === now.getDate() && month === now.getMonth() && year === now.getFullYear();
  };

  return (
    <Box>
      {/* Navigation */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <IconButton onClick={prev} sx={{ color: '#666', '&:hover': { color: '#fff' } }}>
          <ChevronLeftIcon fontSize="small" />
        </IconButton>
        <Typography sx={{ color: '#ccc', fontSize: '0.9rem', fontWeight: 400, letterSpacing: '0.05em' }}>
          {MONTHS[month]} {year}
        </Typography>
        <IconButton onClick={next} sx={{ color: '#666', '&:hover': { color: '#fff' } }}>
          <ChevronRightIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Day headers */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5, mb: 0.5 }}>
        {DAYS.map(d => (
          <Typography key={d} sx={{
            textAlign: 'center', fontSize: '0.65rem', color: '#444',
            letterSpacing: '0.05em', textTransform: 'uppercase', py: 0.5,
          }}>
            {d}
          </Typography>
        ))}
      </Box>

      {/* Days grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5 }}>
        {cells.map((day, i) => {
          if (!day) return <Box key={`e-${i}`} />;
          const key = dateKey(year, month, day);
          const hasMoments = !!momentsByDate[key];
          const isSelected = day === selectedDay;

          return (
            <Box
              key={day}
              onClick={() => setSelectedDay(isSelected ? null : day)}
              sx={{
                aspectRatio: '1', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                borderRadius: 2, cursor: 'pointer', position: 'relative',
                bgcolor: isSelected ? 'rgba(255,255,255,0.1)' : 'transparent',
                border: isToday(day) ? '1px solid rgba(255,255,255,0.15)' : '1px solid transparent',
                transition: 'all 0.2s ease',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
              }}
            >
              <Typography sx={{
                fontSize: '0.8rem',
                color: isSelected ? '#fff' : hasMoments ? '#ddd' : '#555',
                fontWeight: hasMoments ? 500 : 300,
              }}>
                {day}
              </Typography>
              {hasMoments && (
                <Box sx={{
                  width: 4, height: 4, borderRadius: '50%',
                  bgcolor: isSelected ? '#fff' : 'rgba(255,255,255,0.4)',
                  mt: 0.25,
                }} />
              )}
            </Box>
          );
        })}
      </Box>

      {/* Selected day moments */}
      {selectedDay && (
        <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {selectedMoments.length === 0 ? (
            <Typography sx={{ color: '#333', fontSize: '0.8rem', textAlign: 'center' }}>
              Нет моментов в этот день
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {selectedMoments.map(m => (
                <Box key={m.id} onClick={() => onMomentClick?.(m)} sx={{
                  p: 1.5, borderRadius: 2, cursor: onMomentClick ? 'pointer' : 'default',
                  bgcolor: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  transition: 'all 0.2s ease',
                  '&:hover': onMomentClick ? { bgcolor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)' } : {},
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {m.photo_url && (
                      <Box component="img" src={m.photo_url} sx={{
                        width: 36, height: 36, borderRadius: 1.5, objectFit: 'cover', flexShrink: 0,
                      }} />
                    )}
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontSize: '0.85rem', color: '#ddd', fontWeight: 500 }}>
                        {m.title}
                      </Typography>
                      {m.description && (
                        <Typography noWrap sx={{ fontSize: '0.75rem', color: '#555', mt: 0.25 }}>
                          {m.description}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
