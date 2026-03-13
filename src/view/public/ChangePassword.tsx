"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function ChangePassword() {
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "", // antes "oldPassword"
    newPassword: "",
    repeatPassword: "", // antes "confirmPassword"
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { token, logout } = useAuth(); // token desde AuthContext
  const navigate = useNavigate();

  useEffect(() => {
    // Si no hay token, no deberían estar aquí (deberían venir después de un login fallido/requerido)
    if (!token) {
      navigate("/login");
    }
  }, [token, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (form.newPassword !== form.repeatPassword) {
      setError("Las nuevas contraseñas no coinciden.");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        "http://localhost:3000/api/auth/change-password",
        form,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setMessage(
        (response.data.message || "Contraseña actualizada correctamente.") + " Redirigiendo al login..."
      );
      setForm({
        username: "",
        email: "",
        password: "",
        newPassword: "",
        repeatPassword: "",
      });

      // Después de cambiar la contraseña, cerramos sesión (limpiamos token temporal)
      // y redirigimos al login tras un breve delay para que vean el mensaje
      setTimeout(() => {
        logout();
        navigate("/login");
      }, 2000);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Error al cambiar la contraseña."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md p-4 shadow-md">
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="username">Usuario</Label>
              <Input
                id="username"
                name="username"
                value={form.username}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Contraseña actual</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <Label htmlFor="newPassword">Nueva contraseña</Label>
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                value={form.newPassword}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <Label htmlFor="repeatPassword">Confirmar nueva contraseña</Label>
              <Input
                id="repeatPassword"
                name="repeatPassword"
                type="password"
                value={form.repeatPassword}
                onChange={handleChange}
                required
              />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}
            {message && <p className="text-green-600 text-sm">{message}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Actualizando..." : "Cambiar contraseña"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
