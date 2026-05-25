const THEME_KEY = 'nextops_theme';

export function initTheme(): void {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
}

export function toggleTheme(): 'dark' | 'light' {
  const current = document.documentElement.getAttribute('data-theme');
  if (current === 'light') {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem(THEME_KEY, 'dark');
    return 'dark';
  }
  document.documentElement.setAttribute('data-theme', 'light');
  localStorage.setItem(THEME_KEY, 'light');
  return 'light';
}

export function getTheme(): 'dark' | 'light' {
  return document.documentElement.getAttribute('data-theme') === 'light'
    ? 'light'
    : 'dark';
}
