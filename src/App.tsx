import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { CadastroPage } from './features/auth/pages/CadastroPage'
import { LoginPage } from './features/auth/pages/LoginPage'
import { AuthProvider } from './features/auth/context/AuthProvider'
import { RotaProtegida } from './features/auth/components/RotaProtegida'
import { HomePage } from './pages/home/HomePage'
import { PainelPage } from './pages/painel/PainelPage'
import { NovoAgendamentoPage } from './features/agendamentos/pages/NovoAgendamentoPage'
import { MeusAgendamentosPage } from './features/agendamentos/pages/MeusAgendamentosPage'

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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
