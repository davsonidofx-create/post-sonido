export const ROLES = [
  { key: 'coordinadora', label: 'Coordinadora', icon: '📋', color: '#854F0B', bg: '#FAEEDA' },
  { key: 'jefe',         label: 'Jefe',          icon: '👔', color: '#533AB7', bg: '#EEEDFE' },
  { key: 'dx',           label: 'DX / ADR',      icon: '🎙', color: '#185FA5', bg: '#E6F1FB' },
  { key: 'fx',           label: 'FX',            icon: '💥', color: '#993C1D', bg: '#FAECE7' },
  { key: 'foley',        label: 'Foley',         icon: '👟', color: '#854F0B', bg: '#FAEEDA' },
  { key: 'musica',       label: 'Musicalización', icon: '🎵', color: '#993556', bg: '#FBEAF0' },
  { key: 'vfx',         label: 'VFX',            icon: '✨', color: '#444441', bg: '#F1EFE8' },
  { key: 'mezcla',      label: 'Mezcla',         icon: '🎚', color: '#0F6E56', bg: '#E1F5EE' },
]

export const DEPT_KEYS = ['dx', 'adr', 'fx', 'foley', 'musica', 'vfx', 'mezcla']

export const DEPT_LABELS = {
  dx: 'DX', adr: 'ADR', fx: 'FX',
  foley: 'Foley', musica: 'Musicalización',
  vfx: 'VFX', mezcla: 'Mezcla'
}

export const TASK_STATUSES = ['', 'Pendiente', 'En proceso', 'Bloqueado', 'Completo']

export const CAP_PHASES = ['Pendiente', 'En proceso', 'En revision', 'Pendiente ajustes', 'Aprobado']

export const PHASE_STYLE = {
  'Pendiente':         { bg: '#F1EFE8', color: '#444441' },
  'En proceso':        { bg: '#FAEEDA', color: '#633806' },
  'Bloqueado':         { bg: '#FCEBEB', color: '#791F1F' },
  'Completo':          { bg: '#EAF3DE', color: '#27500A' },
  'En revision':       { bg: '#E6F1FB', color: '#0C447C' },
  'Pendiente ajustes': { bg: '#FAEEDA', color: '#854F0B' },
  'Aprobado':          { bg: '#EAF3DE', color: '#3B6D11' },
}

export const STATUS_STYLE = {
  'Completo':   { bg: '#EAF3DE', color: '#27500A' },
  'En proceso': { bg: '#FAEEDA', color: '#633806' },
  'Bloqueado':  { bg: '#FCEBEB', color: '#791F1F' },
  'Pendiente':  { bg: '#F1EFE8', color: '#444441' },
}
