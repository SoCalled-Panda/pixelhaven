import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <main className="notfound-page">
      <p className="notfound-page__code" aria-hidden="true">
        4·0·4
      </p>
      <h1>This little corner is still blank</h1>
      <p className="notfound-page__hint">
        The page you were looking for doesn&apos;t exist — maybe a work in progress, just like an
        uncolored canvas.
      </p>
      <Link className="btn btn--primary" to="/">
        Back to the gallery
      </Link>
    </main>
  );
}
