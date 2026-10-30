import { HashRouter, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './components/ui/Toast';
import { AudioDock } from './audio/AudioDock';
import { HomePage } from './pages/HomePage';
import { ColoringPage } from './pages/ColoringPage';
import { NotFoundPage } from './pages/NotFoundPage';

// HashRouter: deep links must survive refresh on any static host (GitHub Pages
// has no rewrite rules) — see docs/architecture.md §9.
// AudioDock sits above <Routes> so ambience keeps playing across navigation.
export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AudioDock />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/color/:artworkId" element={<ColoringPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </HashRouter>
      </ToastProvider>
    </ErrorBoundary>
  );
}
