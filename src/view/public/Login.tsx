import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { User, Lock, Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";

export default function Login() {
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await axios.post(
        "http://localhost:3000/api/auth/login",
        form,
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      const token = response.data.token || response.data.data?.token;
      let roleId =
        response.data.roleId ||
        response.data.role ||
        response.data.data?.roleId ||
        response.data.data?.role ||
        (response.data.user && response.data.user.roleId);

      if (!token) {
        setError("Error: El servidor no devolvió un token de acceso.");
        setIsLoading(false);
        return;
      }

      login(token, roleId);
      if (roleId === 1) {
        navigate("/dashboard");
      } else if (roleId === 2) {
        navigate("/teacher");
      } else {
        navigate("/");
      }
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as {
          response: {
            status: number;
            data: {
              message?: string;
              change_password_required?: boolean;
              cambiar_password?: boolean;
              token?: string;
              roleId?: number;
              data?: { token?: string; roleId?: number }
            }
          }
        };
        const { status, data } = axiosError.response;

        // Check if password change is required (by flag or message)
        const requiresPasswordChange =
          data.cambiar_password ||
          data.change_password_required ||
          (data.message && data.message.toLowerCase().includes('debe cambiar su contraseña'));

        if ((status === 403 || status === 401) && requiresPasswordChange) {
          const tempToken = data.token || data.data?.token;
          const tempRoleId = data.roleId || data.data?.roleId;

          if (tempToken) {
            // Guardamos el token para que la página de cambio de contraseña lo use
            login(tempToken, tempRoleId || null);
          }
          // Redirect immediately without showing error
          navigate("/change-password");
          return;
        }
        setError(data.message || "Credenciales incorrectas (400)");
      } else {
        setError("Error de conexión con el servidor");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 font-sans antialiased p-4">
      <div className="flex w-full max-w-4xl bg-white rounded-2xl overflow-hidden shadow-xl">

        {/* LADO IZQUIERDO: Branding */}
        <div className="hidden md:flex md:w-1/2 relative bg-gradient-to-br from-slate-900 to-slate-700">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=1200')] bg-cover bg-center opacity-20"></div>

          <div className="relative z-10 p-10 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <img
                  src="https://res.cloudinary.com/dszdc6rh8/image/upload/v1747351782/image_1_vhjpzr.png"
                  alt="Logo Crayon's"
                  className="h-10 w-auto"
                />
              </div>

              <h2 className="text-3xl font-bold text-white leading-tight mb-4">
                El futuro de <br />
                <span className="text-white/60 italic font-light">tus hijos</span> <br />
                comienza aquí.
              </h2>
              <div className="h-1 w-16 bg-[#F26513] rounded-full"></div>
            </div>
          </div>
        </div>

        {/* LADO DERECHO: Formulario */}
        <div className="w-full md:w-1/2 p-8 md:p-10 flex flex-col justify-center">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900 mb-1">MiCole Login</h1>
            <p className="text-slate-500 text-sm">Acceso exclusivo para la comunidad Crayon's</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-3 rounded-lg text-sm">
                <p className="font-semibold text-xs mb-1">Error de acceso</p>
                <p className="text-xs">{error}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">Usuario <span className="text-red-500">*</span></label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  placeholder="DNI o Código de Familia"
                  className="w-full h-10 bg-white border border-slate-300 rounded-lg text-sm pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">Contraseña <span className="text-red-500">*</span></label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Contraseña"
                  className="w-full h-10 bg-white border border-slate-300 rounded-lg text-sm pl-10 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Botón de Acción */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold h-11 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span className="text-sm">Entrar a MiCole</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
