import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "../lib/supabase.js";
import { FormField } from "../components/ui/FormField.jsx";
import { Input } from "../components/ui/Input.jsx";
import { Btn } from "../components/ui/Btn.jsx";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);
  const handleLogin = async () => {
    if (!email || !password) { setError("Ingresa email y contraseña"); return; }
    setLoading(true); setError("");
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) { setError("Credenciales incorrectas"); setLoading(false); return; }
    setLoading(false);
  };
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-lg font-bold text-white">S</div>
          <div><div className="font-semibold text-white text-lg">Medicloud Safety</div><div className="text-xs text-gray-600">by Medicloud</div></div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="text-sm font-semibold text-white mb-4">Iniciar Sesión</div>
          {error && <div className="mb-3 px-3 py-2 rounded-lg bg-red-900/30 border border-red-900 text-red-400 text-xs">{error}</div>}
          <FormField label="Correo electrónico"><Input type="email" placeholder="usuario@empresa.com" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()} /></FormField>
          <FormField label="Contraseña">
            <div className="relative">
              <Input type={showPass ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()} style={{ paddingRight: "36px" }} />
              <button onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400">{showPass ? <EyeOff size={14} /> : <Eye size={14} />}</button>
            </div>
          </FormField>
          <Btn variant="primary" className="w-full justify-center mt-2" disabled={loading} onClick={handleLogin}>{loading ? "Ingresando..." : "Ingresar"}</Btn>
        </div>
        <div className="text-center mt-4 text-xs text-gray-700">Medicloud Safety — Gestión de Seguridad y Salud Ocupacional</div>
      </div>
    </div>
  );
}
