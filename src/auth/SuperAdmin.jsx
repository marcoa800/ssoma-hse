import { useState, useEffect } from "react";
import { Plus, Trash2, Pencil, UserPlus, Settings, Building2 } from "lucide-react";
import { supabase } from "../lib/supabase.js";
import { showToast } from "../lib/toast.jsx";
import { Badge } from "../components/ui/Badge.jsx";
import { KpiCard } from "../components/ui/KpiCard.jsx";
import { Modal } from "../components/ui/Modal.jsx";
import { FormField } from "../components/ui/FormField.jsx";
import { Input } from "../components/ui/Input.jsx";
import { Select } from "../components/ui/Select.jsx";
import { Btn } from "../components/ui/Btn.jsx";

export default function SuperAdmin() {
  const [empresas,        setEmpresas]        = useState([]);
  const [usuarios,        setUsuarios]        = useState([]);
  const [tab,             setTab]             = useState("empresas");
  const [modalEmpresa,    setModalEmpresa]    = useState(false);
  const [editingEmpresa,  setEditingEmpresa]  = useState(null);
  const [modalUsuario,    setModalUsuario]    = useState(false);
  const [formEmpresa,     setFormEmpresa]     = useState({ nombre: "", ruc: "", sector: "" });
  const [formUsuario,     setFormUsuario]     = useState({ email: "", password: "", nombre: "", rol: "SEGURIDAD", empresa_id: "" });
  const [isSaving,        setIsSaving]        = useState(false);
  const [isDeleting,      setIsDeleting]      = useState(null);
  const [deleteTarget,    setDeleteTarget]    = useState(null);
  const [deleteInput,     setDeleteInput]     = useState("");
  const [editingUsuario,  setEditingUsuario]  = useState(null);
  const [formEditUser,    setFormEditUser]    = useState({ nombre: "", rol: "SEGURIDAD", empresa_id: "" });
  const [savingUser,      setSavingUser]      = useState(false);

  useEffect(() => { loadEmpresas(); loadUsuarios(); }, []);

  const loadEmpresas = async () => {
    const { data } = await supabase.from("empresas").select("*").order("nombre");
    setEmpresas(data || []);
  };
  const loadUsuarios = async () => {
    const { data } = await supabase.from("profiles").select("*, empresas(nombre)").order("nombre");
    setUsuarios(data || []);
  };

  const openNuevaEmpresa = () => {
    setEditingEmpresa(null);
    setFormEmpresa({ nombre: "", ruc: "", sector: "" });
    setModalEmpresa(true);
  };
  const openEditarEmpresa = (e) => {
    setEditingEmpresa(e.id);
    setFormEmpresa({ nombre: e.nombre, ruc: e.ruc || "", sector: e.sector || "" });
    setModalEmpresa(true);
  };

  const saveEmpresa = async () => {
    if (!formEmpresa.nombre) { showToast("El nombre es requerido", "error"); return; }
    setIsSaving(true);
    const payload = { nombre: formEmpresa.nombre, ruc: formEmpresa.ruc || null, sector: formEmpresa.sector || null };
    const { error } = editingEmpresa
      ? await supabase.from("empresas").update(payload).eq("id", editingEmpresa)
      : await supabase.from("empresas").insert([payload]);
    if (error) { showToast("Error: " + error.message, "error"); setIsSaving(false); return; }
    showToast(editingEmpresa ? "Empresa actualizada" : "Empresa creada", "success");
    setIsSaving(false); setModalEmpresa(false);
    setFormEmpresa({ nombre: "", ruc: "", sector: "" }); setEditingEmpresa(null);
    loadEmpresas();
  };

  const toggleEmpresa = async (id, activa) => {
    await supabase.from("empresas").update({ activa: !activa }).eq("id", id);
    loadEmpresas();
    showToast(activa ? "Empresa desactivada" : "Empresa activada", "info");
  };

  const pedirConfirmDelete = (e) => { setDeleteTarget(e); setDeleteInput(""); };

  const confirmarDeleteEmpresa = async () => {
    if (!deleteTarget) return;
    setIsDeleting(deleteTarget.id);
    await supabase.from("empresas").delete().eq("id", deleteTarget.id);
    showToast("Empresa eliminada permanentemente", "success");
    setIsDeleting(null); setDeleteTarget(null); setDeleteInput("");
    loadEmpresas();
  };

  const saveUsuario = async () => {
    if (!formUsuario.email || !formUsuario.password || !formUsuario.empresa_id) { showToast("Email, contraseña y empresa son requeridos", "error"); return; }
    if (formUsuario.password.length < 8) { showToast("La contraseña debe tener al menos 8 caracteres", "error"); return; }
    setIsSaving(true);
    const { data, error } = await supabase.auth.signUp({
      email: formUsuario.email,
      password: formUsuario.password,
      options: { emailRedirectTo: "https://ssoma-hse.vercel.app" },
    });
    if (error) { showToast("Error: " + error.message, "error"); setIsSaving(false); return; }
    if (!data.user) { showToast("No se pudo obtener el usuario creado", "error"); setIsSaving(false); return; }
    const { error: profileError } = await supabase.from("profiles").insert([{
      id: data.user.id,
      nombre: formUsuario.nombre || formUsuario.email,
      rol: formUsuario.rol,
      empresa_id: formUsuario.empresa_id,
    }]);
    if (profileError) { showToast("Usuario creado pero error al asignar perfil: " + profileError.message, "error"); }
    else { showToast("✅ Usuario creado. Se envió un email de confirmación a " + formUsuario.email, "success"); }
    setIsSaving(false); setModalUsuario(false);
    setFormUsuario({ email: "", password: "", nombre: "", rol: "SEGURIDAD", empresa_id: "" });
    loadUsuarios();
  };

  const openEditUser = (u) => {
    setEditingUsuario(u);
    setFormEditUser({ nombre: u.nombre || "", rol: u.rol || "SEGURIDAD", empresa_id: u.empresa_id || "" });
  };
  const saveEditUser = async () => {
    if (!formEditUser.empresa_id) { showToast("Selecciona una empresa", "error"); return; }
    setSavingUser(true);
    const { error } = await supabase.from("profiles").update({
      nombre:     formEditUser.nombre,
      rol:        formEditUser.rol,
      empresa_id: formEditUser.empresa_id,
    }).eq("id", editingUsuario.id);
    setSavingUser(false);
    if (error) { showToast("Error: " + error.message, "error"); return; }
    showToast("Usuario actualizado", "success");
    setEditingUsuario(null);
    loadUsuarios();
  };

  const rolColor = { SUPERADMIN: "orange", ADMIN: "purple", MEDICO: "green", SEGURIDAD: "amber" };

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="text-sm font-semibold text-white">Panel de Administración</div>
        <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-orange-900/40 text-orange-400 border border-orange-800"><Settings size={11} /> SUPERADMIN</span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <KpiCard label="Empresas activas" value={empresas.filter(e => e.activa).length} sub={`de ${empresas.length} registradas`} accentColor="blue" />
        <KpiCard label="Usuarios totales" value={usuarios.length} sub="en todas las empresas" accentColor="emerald" />
        <KpiCard label="Empresas inactivas" value={empresas.filter(e => !e.activa).length} sub="suspendidas" accentColor="amber" />
      </div>

      <div className="flex gap-1 border-b border-gray-800 mb-4">
        <button onClick={() => setTab("empresas")} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px flex items-center gap-1.5 ${tab === "empresas" ? "border-blue-500 text-blue-400" : "border-transparent text-gray-500 hover:text-gray-300"}`}><Building2 size={14} /> Empresas ({empresas.length})</button>
        <button onClick={() => setTab("usuarios")} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px flex items-center gap-1.5 ${tab === "usuarios" ? "border-blue-500 text-blue-400" : "border-transparent text-gray-500 hover:text-gray-300"}`}><UserPlus size={14} /> Usuarios ({usuarios.length})</button>
      </div>

      {tab === "empresas" && (
        <div>
          <div className="flex justify-end mb-3">
            <Btn size="sm" variant="primary" onClick={openNuevaEmpresa}><Plus size={13} /> Nueva Empresa</Btn>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-800">{["Empresa", "RUC", "Sector", "Usuarios", "Estado", ""].map(h => <th key={h} className="text-left text-xs text-gray-600 font-medium px-4 py-3 uppercase tracking-wide">{h}</th>)}</tr></thead>
              <tbody>
                {empresas.map(e => {
                  const uCount = usuarios.filter(u => u.empresa_id === e.id).length;
                  return (
                    <tr key={e.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="px-4 py-3 font-medium text-white">{e.nombre}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{e.ruc || "—"}</td>
                      <td className="px-4 py-3 text-gray-400">{e.sector || "—"}</td>
                      <td className="px-4 py-3"><Badge color={uCount > 0 ? "blue" : "gray"}>{uCount} usuario{uCount !== 1 ? "s" : ""}</Badge></td>
                      <td className="px-4 py-3"><Badge color={e.activa ? "green" : "red"}>{e.activa ? "Activa" : "Inactiva"}</Badge></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Btn size="sm" onClick={() => openEditarEmpresa(e)}><Pencil size={12} /></Btn>
                          <Btn size="sm" variant={e.activa ? "danger" : "success"} onClick={() => toggleEmpresa(e.id, e.activa)}>{e.activa ? "Suspender" : "Activar"}</Btn>
                          <Btn size="sm" variant="danger" disabled={isDeleting === e.id} onClick={() => pedirConfirmDelete(e)}><Trash2 size={12} /></Btn>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {empresas.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-600 text-sm">No hay empresas registradas</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "usuarios" && (
        <div>
          <div className="flex justify-end mb-3">
            <Btn size="sm" variant="primary" onClick={() => setModalUsuario(true)}><UserPlus size={13} /> Nuevo Usuario</Btn>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  {["Nombre / Email", "Empresa", "Rol", ""].map(h => (
                    <th key={h} className="text-left text-xs text-gray-600 font-medium px-4 py-3 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usuarios.map(u => (
                  <tr key={u.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{u.nombre || <span className="text-gray-600 italic">Sin nombre</span>}</div>
                      <div className="text-xs text-gray-600 mt-0.5">{u.email || ""}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-sm">
                      {u.empresas?.nombre || <span className="text-red-500/70 text-xs">Sin empresa</span>}
                    </td>
                    <td className="px-4 py-3"><Badge color={rolColor[u.rol] || "gray"}>{u.rol}</Badge></td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openEditUser(u)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-gray-800 border border-gray-800 hover:border-gray-700 transition-colors"
                      >
                        <Pencil size={12} /> Editar
                      </button>
                    </td>
                  </tr>
                ))}
                {usuarios.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-600 text-sm">No hay usuarios</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modalEmpresa && (
        <Modal title={editingEmpresa ? "Editar Empresa" : "Nueva Empresa"} onClose={() => setModalEmpresa(false)}>
          <FormField label="Nombre de la empresa">
            <Input value={formEmpresa.nombre} onChange={e => setFormEmpresa(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej. Hydro Global Perú SAC" />
          </FormField>
          <FormField label="RUC">
            <Input
              value={formEmpresa.ruc}
              maxLength={11}
              onChange={e => setFormEmpresa(f => ({ ...f, ruc: e.target.value.replace(/\D/g, "") }))}
              placeholder="20123456789"
            />
          </FormField>
          <FormField label="Sector">
            <Select value={formEmpresa.sector} onChange={e => setFormEmpresa(f => ({ ...f, sector: e.target.value }))}>
              <option value="">Seleccionar...</option>
              {["Reciclaje", "Hidroeléctrico", "Construcción", "Retail", "Manufactura", "Servicios", "Telecomunicaciones", "Minería", "Otro"].map(s => <option key={s}>{s}</option>)}
            </Select>
          </FormField>
          <div className="flex gap-2 justify-end mt-4">
            <Btn onClick={() => setModalEmpresa(false)}>Cancelar</Btn>
            <Btn variant="primary" disabled={isSaving} onClick={saveEmpresa}>
              {isSaving ? "Guardando..." : editingEmpresa ? "Guardar cambios" : "Crear Empresa"}
            </Btn>
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <Modal title="⚠ Eliminar empresa" onClose={() => setDeleteTarget(null)}>
          <div className="space-y-4">
            <div className="bg-red-900/20 border border-red-800/50 rounded-lg p-3">
              <p className="text-sm text-red-400 font-medium mb-1">Esta acción es irreversible.</p>
              <p className="text-xs text-red-400/70">Se eliminarán <strong>todos los datos</strong> de la empresa: trabajadores, capacitaciones, vigilancia médica, RACs, inspecciones, EPPs y documentos.</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-2">
                Para confirmar, escribe el nombre exacto de la empresa:
              </p>
              <p className="text-sm font-semibold text-white mb-2 px-3 py-2 bg-gray-800 rounded-lg border border-gray-700 font-mono">
                {deleteTarget.nombre}
              </p>
              <Input
                value={deleteInput}
                onChange={e => setDeleteInput(e.target.value)}
                placeholder="Escribe el nombre para confirmar..."
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Btn onClick={() => setDeleteTarget(null)} className="flex-1 justify-center">Cancelar</Btn>
              <button
                onClick={confirmarDeleteEmpresa}
                disabled={deleteInput.trim() !== deleteTarget.nombre.trim() || isDeleting === deleteTarget.id}
                className="flex-1 flex items-center justify-center gap-2 bg-red-700 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold py-2 rounded-lg transition-colors"
              >
                <Trash2 size={14} />
                {isDeleting === deleteTarget.id ? "Eliminando..." : "Eliminar definitivamente"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {editingUsuario && (
        <Modal title="Editar Usuario" onClose={() => setEditingUsuario(null)}>
          <div className="mb-4 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-xs text-gray-400 flex items-center gap-2">
            <span className="text-gray-600">Email:</span>
            <span className="text-white font-mono">{editingUsuario.email || "—"}</span>
          </div>
          <FormField label="Nombre completo">
            <Input value={formEditUser.nombre} onChange={e => setFormEditUser(f => ({ ...f, nombre: e.target.value }))} placeholder="Nombre del usuario" />
          </FormField>
          <FormField label="Empresa">
            <Select value={formEditUser.empresa_id} onChange={e => setFormEditUser(f => ({ ...f, empresa_id: e.target.value }))}>
              <option value="">Seleccionar empresa...</option>
              {empresas.filter(e => e.activa).map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </Select>
          </FormField>
          <FormField label="Rol">
            <Select value={formEditUser.rol} onChange={e => setFormEditUser(f => ({ ...f, rol: e.target.value }))}>
              <option value="SEGURIDAD">SEGURIDAD — Jefe de Seguridad</option>
              <option value="MEDICO">MEDICO — Médico Ocupacional</option>
              <option value="ADMIN">ADMIN — Administrador</option>
              <option value="SUPERADMIN">SUPERADMIN — Super Administrador</option>
            </Select>
          </FormField>
          <div className="flex gap-2 justify-end mt-4">
            <Btn onClick={() => setEditingUsuario(null)}>Cancelar</Btn>
            <Btn variant="primary" disabled={savingUser} onClick={saveEditUser}>
              {savingUser ? "Guardando..." : "Guardar cambios"}
            </Btn>
          </div>
        </Modal>
      )}

      {modalUsuario && (
        <Modal title="Nuevo Usuario" onClose={() => setModalUsuario(false)}>
          <div className="mb-3 px-3 py-2 rounded-lg bg-blue-900/20 border border-blue-900/40 text-xs text-blue-400">
            Se enviará un email de confirmación al usuario. Deberá hacer clic en el enlace antes de poder ingresar. La contraseña que ingreses aquí será su clave de acceso inicial.
          </div>
          <FormField label="Nombre completo"><Input value={formUsuario.nombre} onChange={e => setFormUsuario(f => ({ ...f, nombre: e.target.value }))} placeholder="Dr. Juan Pérez" /></FormField>
          <FormField label="Email"><Input type="email" value={formUsuario.email} onChange={e => setFormUsuario(f => ({ ...f, email: e.target.value }))} placeholder="usuario@empresa.com" /></FormField>
          <FormField label="Contraseña temporal"><Input type="password" value={formUsuario.password} onChange={e => setFormUsuario(f => ({ ...f, password: e.target.value }))} placeholder="Mínimo 8 caracteres" /></FormField>
          <FormField label="Empresa">
            <Select value={formUsuario.empresa_id} onChange={e => setFormUsuario(f => ({ ...f, empresa_id: e.target.value }))}>
              <option value="">Seleccionar empresa...</option>
              {empresas.filter(e => e.activa).map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </Select>
          </FormField>
          <FormField label="Rol">
            <Select value={formUsuario.rol} onChange={e => setFormUsuario(f => ({ ...f, rol: e.target.value }))}>
              <option value="SEGURIDAD">SEGURIDAD — Jefe de Seguridad</option>
              <option value="MEDICO">MEDICO — Médico Ocupacional</option>
              <option value="ADMIN">ADMIN — Administrador</option>
            </Select>
          </FormField>
          <div className="flex gap-2 justify-end mt-4">
            <Btn onClick={() => setModalUsuario(false)}>Cancelar</Btn>
            <Btn variant="primary" disabled={isSaving} onClick={saveUsuario}>{isSaving ? "Creando..." : "Crear Usuario"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
