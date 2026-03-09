import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Shield, UserPlus, Pencil, Trash2, Plus, Search, Users2, KeyRound } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useAuditLog } from '@/hooks/useAuditLog';
import { useToast } from '@/hooks/use-toast';

interface Profile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  department: string | null;
  phone: string | null;
}

interface Role {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
}

interface UserRole {
  user_id: string;
  role_id: string;
}

interface RolePermission {
  id: string;
  role_id: string;
  page_path: string;
  can_view: boolean;
  can_edit: boolean;
}

const ALL_PAGES = [
  { path: '/', label: 'Dashboard' },
  { path: '/printers', label: 'Impressoras' },
  { path: '/alerts', label: 'Alertas' },
  { path: '/network-map', label: 'Mapa de Rede' },
  { path: '/maintenance', label: 'Manutenção' },
  { path: '/history', label: 'Histórico' },
  { path: '/sectors', label: 'Setores' },
  { path: '/reports', label: 'Relatórios' },
  { path: '/data-sources', label: 'Fontes de Dados' },
  { path: '/settings', label: 'Configurações' },
  { path: '/users', label: 'Usuários' },
  { path: '/audit', label: 'Auditoria' },
];

export default function UsersPage() {
  const { hasRole } = useAuth();
  const { logAction } = useAuditLog();
  const { toast } = useToast();
  const isAdmin = hasRole('admin') || hasRole('dev');

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Edit user dialog
  const [editUser, setEditUser] = useState<Profile | null>(null);
  const [editName, setEditName] = useState('');
  const [editDept, setEditDept] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRoleId, setEditRoleId] = useState('');

  // Role management
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [editRole, setEditRole] = useState<Role | null>(null);
  const [roleName, setRoleName] = useState('');
  const [roleDesc, setRoleDesc] = useState('');

  // Permission editing
  const [permRole, setPermRole] = useState<Role | null>(null);
  const [permEdits, setPermEdits] = useState<Record<string, { can_view: boolean; can_edit: boolean }>>({});

  const fetchAll = useCallback(async () => {
    const [p, r, ur, rp] = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('roles').select('*').order('name'),
      supabase.from('user_roles').select('user_id, role_id'),
      supabase.from('role_permissions').select('*'),
    ]);
    if (p.data) setProfiles(p.data as unknown as Profile[]);
    if (r.data) setRoles(r.data as unknown as Role[]);
    if (ur.data) setUserRoles(ur.data as unknown as UserRole[]);
    if (rp.data) setPermissions(rp.data as unknown as RolePermission[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const getUserRole = (userId: string) => {
    const ur = userRoles.find(ur => ur.user_id === userId);
    return ur ? roles.find(r => r.id === ur.role_id) : null;
  };

  const filteredProfiles = profiles.filter(p => {
    if (!search) return true;
    const s = search.toLowerCase();
    return p.full_name.toLowerCase().includes(s) || p.email.toLowerCase().includes(s);
  });

  // --- Edit User ---
  const openEditUser = (profile: Profile) => {
    setEditUser(profile);
    setEditName(profile.full_name);
    setEditDept(profile.department || '');
    setEditPhone(profile.phone || '');
    const role = getUserRole(profile.id);
    setEditRoleId(role?.id || '');
  };

  const saveUser = async () => {
    if (!editUser) return;
    const { error } = await supabase.from('profiles').update({
      full_name: editName,
      department: editDept || null,
      phone: editPhone || null,
      updated_at: new Date().toISOString(),
    } as any).eq('id', editUser.id);

    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }

    // Update role
    const currentRole = userRoles.find(ur => ur.user_id === editUser.id);
    if (editRoleId && currentRole?.role_id !== editRoleId) {
      if (currentRole) {
        await supabase.from('user_roles').delete().eq('user_id', editUser.id);
      }
      await supabase.from('user_roles').insert({ user_id: editUser.id, role_id: editRoleId } as any);
    }

    await logAction('UPDATE', 'profiles', editUser.id, `Perfil de ${editName} atualizado`);
    toast({ title: 'Usuário atualizado' });
    setEditUser(null);
    fetchAll();
  };

  // --- Roles CRUD ---
  const openNewRole = () => {
    setEditRole(null);
    setRoleName('');
    setRoleDesc('');
    setShowRoleDialog(true);
  };

  const openEditRole = (role: Role) => {
    setEditRole(role);
    setRoleName(role.name);
    setRoleDesc(role.description || '');
    setShowRoleDialog(true);
  };

  const saveRole = async () => {
    if (!roleName.trim()) return;
    if (editRole) {
      await supabase.from('roles').update({ name: roleName, description: roleDesc } as any).eq('id', editRole.id);
      await logAction('UPDATE', 'roles', editRole.id, `Cargo ${roleName} atualizado`);
    } else {
      await supabase.from('roles').insert({ name: roleName, description: roleDesc } as any);
      await logAction('INSERT', 'roles', undefined, `Cargo ${roleName} criado`);
    }
    toast({ title: editRole ? 'Cargo atualizado' : 'Cargo criado' });
    setShowRoleDialog(false);
    fetchAll();
  };

  const deleteRole = async (role: Role) => {
    if (role.is_system) { toast({ title: 'Não é possível excluir cargos do sistema', variant: 'destructive' }); return; }
    await supabase.from('roles').delete().eq('id', role.id);
    await logAction('DELETE', 'roles', role.id, `Cargo ${role.name} excluído`);
    toast({ title: 'Cargo excluído' });
    fetchAll();
  };

  // --- Permissions ---
  const openPermissions = (role: Role) => {
    setPermRole(role);
    const perms: Record<string, { can_view: boolean; can_edit: boolean }> = {};
    ALL_PAGES.forEach(p => {
      const existing = permissions.find(rp => rp.role_id === role.id && rp.page_path === p.path);
      perms[p.path] = { can_view: existing?.can_view || false, can_edit: existing?.can_edit || false };
    });
    setPermEdits(perms);
  };

  const savePermissions = async () => {
    if (!permRole) return;
    // Delete existing and re-insert
    await supabase.from('role_permissions').delete().eq('role_id', permRole.id);
    const rows = Object.entries(permEdits)
      .filter(([_, v]) => v.can_view || v.can_edit)
      .map(([page_path, v]) => ({
        role_id: permRole.id,
        page_path,
        can_view: v.can_view,
        can_edit: v.can_edit,
      }));
    if (rows.length > 0) {
      await supabase.from('role_permissions').insert(rows as any);
    }
    await logAction('UPDATE', 'role_permissions', permRole.id, `Permissões do cargo ${permRole.name} atualizadas`);
    toast({ title: 'Permissões salvas' });
    setPermRole(null);
    fetchAll();
  };

  const roleLabels: Record<string, string> = { dev: 'Desenvolvedor', admin: 'Administrador', technician: 'Técnico', viewer: 'Visualizador' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Shield className="w-6 h-6" /> Usuários & Permissões</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerenciamento de usuários, cargos e acessos</p>
        </div>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users"><Users2 className="w-4 h-4 mr-1" /> Usuários</TabsTrigger>
          <TabsTrigger value="roles"><KeyRound className="w-4 h-4 mr-1" /> Cargos & Permissões</TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar usuário..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {roles.slice(0, 3).map(role => (
              <Card key={role.id}>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold">{userRoles.filter(ur => ur.role_id === role.id).length}</p>
                  <p className="text-xs text-muted-foreground">{roleLabels[role.name] || role.name}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Cargo</TableHead>
                  {isAdmin && <TableHead>Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : filteredProfiles.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum usuário encontrado</TableCell></TableRow>
                ) : (
                  filteredProfiles.map(p => {
                    const role = getUserRole(p.id);
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.full_name || '—'}</TableCell>
                        <TableCell className="text-muted-foreground">{p.email}</TableCell>
                        <TableCell className="text-muted-foreground">{p.department || '—'}</TableCell>
                        <TableCell>
                          <Badge variant={role?.name === 'admin' ? 'default' : role?.name === 'technician' ? 'secondary' : 'outline'}>
                            {roleLabels[role?.name || ''] || role?.name || 'Sem cargo'}
                          </Badge>
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => openEditUser(p)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Roles Tab */}
        <TabsContent value="roles" className="space-y-4">
          {isAdmin && (
            <div className="flex justify-end">
              <Button onClick={openNewRole}><Plus className="w-4 h-4 mr-2" /> Novo Cargo</Button>
            </div>
          )}

          <div className="grid gap-4">
            {roles.map(role => (
              <Card key={role.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{roleLabels[role.name] || role.name}</h3>
                      {role.is_system && <Badge variant="outline" className="text-xs">Sistema</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{role.description || 'Sem descrição'}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {permissions.filter(p => p.role_id === role.id && p.can_view).length} páginas com acesso
                    </p>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openPermissions(role)}>
                        <KeyRound className="w-4 h-4 mr-1" /> Permissões
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openEditRole(role)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      {!role.is_system && (
                        <Button variant="ghost" size="sm" onClick={() => deleteRole(role)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit User Dialog */}
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Usuário</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Departamento</Label>
              <Input value={editDept} onChange={e => setEditDept(e.target.value)} placeholder="Ex: TI, RH..." />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="(00) 00000-0000" />
            </div>
            <div className="space-y-2">
              <Label>Cargo</Label>
              <Select value={editRoleId} onValueChange={setEditRoleId}>
                <SelectTrigger><SelectValue placeholder="Selecione um cargo" /></SelectTrigger>
                <SelectContent>
                  {roles.map(r => (
                    <SelectItem key={r.id} value={r.id}>{roleLabels[r.name] || r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancelar</Button>
            <Button onClick={saveUser}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editRole ? 'Editar Cargo' : 'Novo Cargo'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Cargo</Label>
              <Input value={roleName} onChange={e => setRoleName(e.target.value)} placeholder="Ex: supervisor" />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input value={roleDesc} onChange={e => setRoleDesc(e.target.value)} placeholder="Descrição do cargo..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRoleDialog(false)}>Cancelar</Button>
            <Button onClick={saveRole}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permissions Dialog */}
      <Dialog open={!!permRole} onOpenChange={() => setPermRole(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Permissões: {permRole && (roleLabels[permRole.name] || permRole.name)}</DialogTitle></DialogHeader>
          <ScrollArea className="max-h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Página</TableHead>
                  <TableHead className="text-center">Visualizar</TableHead>
                  <TableHead className="text-center">Editar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ALL_PAGES.map(page => (
                  <TableRow key={page.path}>
                    <TableCell className="text-sm">{page.label}</TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={permEdits[page.path]?.can_view || false}
                        onCheckedChange={(v) => setPermEdits(prev => ({
                          ...prev,
                          [page.path]: { ...prev[page.path], can_view: v, can_edit: v ? prev[page.path]?.can_edit : false }
                        }))}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={permEdits[page.path]?.can_edit || false}
                        disabled={!permEdits[page.path]?.can_view}
                        onCheckedChange={(v) => setPermEdits(prev => ({
                          ...prev,
                          [page.path]: { ...prev[page.path], can_edit: v, can_view: v ? true : prev[page.path]?.can_view }
                        }))}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPermRole(null)}>Cancelar</Button>
            <Button onClick={savePermissions}>Salvar Permissões</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
