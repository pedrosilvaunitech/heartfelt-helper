import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Printer, Bell, Map, History, Building2, 
  BarChart3, Settings, Shield, Wrench
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePrinters } from '@/context/PrinterContext';

const navItemsBase: { to: string; icon: any; label: string; badge?: number }[] = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/printers', icon: Printer, label: 'Impressoras' },
  { to: '/alerts', icon: Bell, label: 'Alertas' },
  { to: '/network-map', icon: Map, label: 'Mapa de Rede' },
  { to: '/maintenance', icon: Wrench, label: 'Manutenção' },
  { to: '/history', icon: History, label: 'Histórico' },
  { to: '/sectors', icon: Building2, label: 'Setores' },
  { to: '/reports', icon: BarChart3, label: 'Relatórios' },
];

const bottomItems = [
  { to: '/settings', icon: Settings, label: 'Configurações' },
  { to: '/users', icon: Shield, label: 'Usuários' },
];

export function AppSidebar() {
  const location = useLocation();
  const { alerts } = usePrinters();
  
  const navItems = navItemsBase.map(item => 
    item.to === '/alerts' ? { ...item, badge: alerts.filter(a => !a.acknowledged).length } : item
  );
  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col">
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Printer className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-sidebar-foreground">PrintGuard</h1>
            <p className="text-[10px] text-sidebar-foreground/50 uppercase tracking-widest">Monitor Pro</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const active = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-primary/20"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.badge && item.badge > 0 && (
                <span className="bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-sidebar-border space-y-1">
        {bottomItems.map(item => {
          const active = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
