import { Route, Routes } from 'react-router';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { AppLayout } from './components/AppLayout';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { PlantDetailPage } from './pages/PlantDetailPage';
import { PlantFormPage } from './pages/PlantFormPage';
import { PlantsListPage } from './pages/PlantsListPage';

// Mapa das telas. Tudo dentro de <ProtectedRoute> exige login (e ganha a moldura <AppLayout>).
export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="usinas" element={<PlantsListPage />} />
          {/* "nova" precisa vir antes de ":id", senão "nova" seria lido como um id. */}
          <Route path="usinas/nova" element={<PlantFormPage />} />
          <Route path="usinas/:id" element={<PlantDetailPage />} />
          <Route path="usinas/:id/editar" element={<PlantFormPage />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
