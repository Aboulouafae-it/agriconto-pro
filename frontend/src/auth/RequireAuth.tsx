import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";

export function RequireAuth() {
  const auth = useAuth();
  const location = useLocation();

  if (auth.isLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-mist px-4">
        <div className="rounded-md border border-stone-200 bg-white px-5 py-4 text-sm text-stone-600">
          Caricamento sessione...
        </div>
      </main>
    );
  }

  if (!auth.token || !auth.user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
