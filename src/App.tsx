import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { CadastroPage } from './features/auth/pages/CadastroPage'
import { LoginPage } from './features/auth/pages/LoginPage'
import { HomePage } from './pages/home/HomePage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/entrar" element={<LoginPage />} />
        <Route path="/cadastro" element={<CadastroPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
