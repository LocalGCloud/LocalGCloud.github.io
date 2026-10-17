if (import.meta.env.DEV && ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)
    && !document.getElementById('local-agentation-root')) {
  const [{ createElement }, { createRoot }, { Agentation }] = await Promise.all([
    import('react'), import('react-dom/client'), import('agentation'),
  ]);
  const host = document.createElement('div');
  host.id = 'local-agentation-root';
  document.body.append(host);
  const root = createRoot(host);
  root.render(createElement(Agentation, {
    endpoint: 'http://localhost:4747',
    appName: 'LocalCloud site',
  }));
  import.meta.hot?.accept();
  import.meta.hot?.dispose(() => {
    root.unmount();
    host.remove();
  });
}
