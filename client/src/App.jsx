import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Board from "./pages/Board";
import ApplicationDetail from "./pages/ApplicationDetail";
import Reminders from "./pages/Reminders";
import Resumes from "./pages/Resumes";
import Analytics from "./pages/Analytics";
import { PageLoader } from "./components/ui";

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  return user ? children : <Navigate to="/login" replace />;
}

function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  return user ? <Navigate to="/" replace /> : children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
      <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route index element={<Board />} />
        <Route path="applications/:id" element={<ApplicationDetail />} />
        <Route path="reminders" element={<Reminders />} />
        <Route path="resumes" element={<Resumes />} />
        <Route path="analytics" element={<Analytics />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
