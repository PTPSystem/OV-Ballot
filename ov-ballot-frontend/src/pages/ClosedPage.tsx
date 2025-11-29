export default function ClosedPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
      <div className="max-w-md text-center">
        <div className="text-6xl mb-6">🔒</div>
        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          Tournament Closed
        </h1>
        <p className="text-gray-600 mb-6">
          This tournament has ended and ballot submission is no longer available.
        </p>
        <p className="text-gray-500 text-sm">
          If you believe this is an error, please contact the tournament administrator.
        </p>
      </div>
    </div>
  );
}
