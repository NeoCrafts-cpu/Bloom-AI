export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-bloom-orange mb-4">404</h1>
        <p className="text-bloom-text-muted">Page not found</p>
        <a href="/" className="mt-4 inline-block text-bloom-orange hover:underline">
          Go home
        </a>
      </div>
    </div>
  );
}
