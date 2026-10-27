import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  Wrench, 
  FileText, 
  LogOut, 
  Menu, 
  X,
  Bell,
  HardDrive
} from 'lucide-react';

export default function DashboardLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getNavigation = () => {
    if (user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'CRM') {
      return [
        { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
        { name: 'Users & Roles', href: '/admin/users', icon: Users },
        { name: 'Customers', href: '/admin/customers', icon: Users },
        { name: 'Products', href: '/admin/products', icon: Package },
        { name: 'Installed Assets', href: '/admin/installed-assets', icon: HardDrive },
        { name: 'Service Catalog', href: '/admin/service-catalog', icon: Wrench },
        { name: 'Service Requests', href: '/admin/services', icon: FileText },
        { name: 'Invoices', href: '/admin/invoices', icon: FileText },
      ];
    }
    if (user?.role === 'TECHNICIAN') {
      return [
        { name: 'My Dashboard', href: '/technician', icon: LayoutDashboard },
        { name: 'My Tasks', href: '/technician/tasks', icon: Wrench },
        { name: 'Attendance', href: '/technician/attendance', icon: Users },
      ];
    }
    if (user?.role === 'CUSTOMER') {
      return [
        { name: 'My Dashboard', href: '/customer', icon: LayoutDashboard },
        { name: 'My Requests', href: '/customer/requests', icon: Wrench },
        { name: 'Billing History', href: '/customer/billing', icon: FileText },
      ];
    }
    return [];
  };

  const navigation = getNavigation();

  return (
    <div className="min-h-screen bg-muted/30 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-card border-r border-border">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <span className="text-lg font-bold text-primary truncate" title="Pratham Enterprises Mysore Service Management System">Pratham Enterprises Mysore Service Management system</span>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.href}
                end={item.href === '/admin'}
                className={({ isActive }) =>
                  `flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                    isActive 
                      ? 'bg-primary text-primary-foreground' 
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`
                }
              >
                <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                {item.name}
              </NavLink>
            );
          })}
        </nav>
        <div className="p-4 border-t border-border">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-foreground">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.role}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 sm:px-6 z-10 shadow-sm">
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="text-muted-foreground hover:text-foreground focus:outline-none"
            >
              <Menu className="h-6 w-6" />
            </button>
            <span className="text-lg font-bold text-primary truncate" title="Pratham Enterprises Mysore Service Management System">Pratham Enterprises Mysore Service Management system</span>
          </div>
          
          <div className="flex items-center space-x-4 ml-auto">
            <button className="text-muted-foreground hover:text-foreground relative p-1">
              <Bell className="h-5 w-5" />
              <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-destructive ring-2 ring-card"></span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center text-sm font-medium text-muted-foreground hover:text-destructive transition-colors"
            >
              <LogOut className="h-5 w-5 mr-1.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <Outlet />
        </div>
      </main>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="fixed inset-y-0 left-0 flex flex-col w-64 bg-card border-r border-border shadow-xl transform transition-transform duration-300 ease-in-out translate-x-0">
            <div className="h-16 flex items-center justify-between px-6 border-b border-border">
              <span className="text-lg font-bold text-primary">Menu</span>
              <button onClick={() => setIsMobileMenuOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-6 w-6" />
              </button>
            </div>
            <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    end={item.href === '/admin'}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                        isActive 
                          ? 'bg-primary text-primary-foreground' 
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`
                    }
                  >
                    <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                    {item.name}
                  </NavLink>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
