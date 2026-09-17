import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { CadastroPage } from './features/auth/pages/CadastroPage'
import { LoginPage } from './features/auth/pages/LoginPage'
import { AuthProvider } from './features/auth/context/AuthProvider'
import { RotaProtegida } from './features/auth/components/RotaProtegida'
import { HomePage } from './pages/home/HomePage'
import { PainelPage } from './pages/painel/PainelPage'
import { NovoAgendamentoPage } from './features/agendamentos/pages/NovoAgendamentoPage'
import { MeusAgendamentosPage } from './features/agendamentos/pages/MeusAgendamentosPage'
import { AgendaProfissionalPage } from './features/profissional/pages/AgendaProfissionalPage'
import { AdminServicosPage } from './features/admin/servicos/AdminServicosPage'
import { AdminProfissionaisPage } from './features/admin/profissionais/AdminProfissionaisPage'
import { DisponibilidadeProfissionalPage } from './features/profissional/disponibilidade/DisponibilidadeProfissionalPage'
import { AdminDashboardPage } from './features/admin/dashboard/AdminDashboardPage'
import { AdminUsuariosPage } from './features/admin/usuarios/AdminUsuariosPage'
import { AdminBarbeariasPage } from './features/admin/barbearias/AdminBarbeariasPage'
import { MinhaBarbeariaPage } from './features/profissional/barbearia/MinhaBarbeariaPage'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/entrar" element={<LoginPage />} />
          <Route path="/cadastro" element={<CadastroPage />} />
          <Route path="/painel" element={<RotaProtegida><PainelPage /></RotaProtegida>} />
          <Route path="/agendar" element={<RotaProtegida><NovoAgendamentoPage /></RotaProtegida>} />
          <Route path="/meus-agendamentos" element={<RotaProtegida><MeusAgendamentosPage /></RotaProtegida>} />
          <Route path="/profissional/agenda" element={
            <RotaProtegida perfis={['PROFISSIONAL']}><AgendaProfissionalPage /></RotaProtegida>
          } />
		  <Route path="/profissional/disponibilidade" element={
			<RotaProtegida perfis={['PROFISSIONAL']}><DisponibilidadeProfissionalPage /></RotaProtegida>
		  } />
		  <Route path="/profissional/barbearia" element={
			<RotaProtegida perfis={['PROFISSIONAL']}><MinhaBarbeariaPage /></RotaProtegida>
		  } />
          <Route path="/admin/servicos" element={
            <RotaProtegida perfis={['ADMIN']}><AdminServicosPage /></RotaProtegida>
          } />
          <Route path="/admin" element={
            <RotaProtegida perfis={['ADMIN']}><AdminDashboardPage /></RotaProtegida>
          } />
          <Route path="/admin/usuarios" element={
            <RotaProtegida perfis={['ADMIN']}><AdminUsuariosPage /></RotaProtegida>
          } />
		  <Route path="/admin/profissionais" element={
			<RotaProtegida perfis={['ADMIN']}><AdminProfissionaisPage /></RotaProtegida>
		  } />
		  <Route path="/admin/barbearias" element={
			<RotaProtegida perfis={['ADMIN']}><AdminBarbeariasPage /></RotaProtegida>
		  } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
