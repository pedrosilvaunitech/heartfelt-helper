import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield, UserPlus } from 'lucide-react';

const users = [
  { id: 1, name: 'Carlos Admin', email: 'carlos@empresa.com', role: 'admin' as const },
  { id: 2, name: 'Ana Técnica', email: 'ana@empresa.com', role: 'technician' as const },
  { id: 3, name: 'João Viewer', email: 'joao@empresa.com', role: 'viewer' as const },
  { id: 4, name: 'Maria Técnica', email: 'maria@empresa.com', role: 'technician' as const },
];

const roleLabels = { admin: 'Administrador', technician: 'Técnico', viewer: 'Visualizador' };
const roleVariants = { admin: 'default' as const, technician: 'secondary' as const, viewer: 'outline' as const };

export default function Users() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Usuários</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerenciamento de permissões e acessos</p>
        </div>
        <Button><UserPlus className="w-4 h-4 mr-2" /> Novo Usuário</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{users.filter(u => u.role === 'admin').length}</p><p className="text-xs text-muted-foreground">Administradores</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{users.filter(u => u.role === 'technician').length}</p><p className="text-xs text-muted-foreground">Técnicos</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{users.filter(u => u.role === 'viewer').length}</p><p className="text-xs text-muted-foreground">Visualizadores</p></CardContent></Card>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Permissão</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map(u => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell className="text-muted-foreground">{u.email}</TableCell>
                <TableCell><Badge variant={roleVariants[u.role]}>{roleLabels[u.role]}</Badge></TableCell>
                <TableCell><Button variant="ghost" size="sm">Editar</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
