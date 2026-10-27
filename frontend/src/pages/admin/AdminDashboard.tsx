import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Users, Wrench, IndianRupee, Clock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const [metrics, setMetrics] = useState({
    totalCustomers: 0,
    totalTechnicians: 0,
    pendingServices: 0,
    completedServices: 0,
    recentRequests: [] as any[],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await api.get('/reports/metrics');
        setMetrics({
          ...response.data,
          recentRequests: response.data.recentRequests || [],
        });
      } catch (error) {
        console.error('Failed to fetch dashboard metrics', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  const statCards = [
    { name: 'Total Customers', value: metrics.totalCustomers, icon: Users, color: 'text-blue-600', bgColor: 'bg-blue-100' },
    { name: 'Total Technicians', value: metrics.totalTechnicians, icon: Wrench, color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
    { name: 'Pending Services', value: metrics.pendingServices, icon: Clock, color: 'text-amber-600', bgColor: 'bg-amber-100' },
    { name: 'Completed Services', value: metrics.completedServices, icon: IndianRupee, color: 'text-green-600', bgColor: 'bg-green-100' },
  ];

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard Overview</h1>
        <p className="text-muted-foreground mt-1">Welcome back. Here is what's happening today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="relative overflow-hidden rounded-xl bg-card border border-border p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-1">
              <div className="flex items-center">
                <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">{stat.name}</p>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions & Recent Activity Grid */}
      <div className={`grid grid-cols-1 gap-6 mt-8 ${isAdmin ? 'lg:grid-cols-2' : ''}`}>
        {/* Quick Actions */}
        {isAdmin && (
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="border-b border-border px-6 py-4">
              <h3 className="text-lg font-medium text-foreground">Quick Actions</h3>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link to="/admin/services" className="group flex items-center justify-between rounded-lg border border-border p-4 hover:border-primary hover:bg-primary/5 transition-all">
                <div className="flex items-center">
                  <Wrench className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                  <span className="ml-3 font-medium text-foreground">Assign Technician</span>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transform group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link to="/admin/invoices" className="group flex items-center justify-between rounded-lg border border-border p-4 hover:border-primary hover:bg-primary/5 transition-all">
                <div className="flex items-center">
                  <IndianRupee className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                  <span className="ml-3 font-medium text-foreground">Generate Invoice</span>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transform group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link to="/admin/users" className="group flex items-center justify-between rounded-lg border border-border p-4 hover:border-primary hover:bg-primary/5 transition-all">
                <div className="flex items-center">
                  <Users className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                  <span className="ml-3 font-medium text-foreground">Add New User</span>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transform group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        )}

        {/* Recent Service Requests */}
        <div className="rounded-xl border border-border bg-card shadow-sm flex flex-col">
          <div className="border-b border-border px-6 py-4 flex items-center justify-between">
            <h3 className="text-lg font-medium text-foreground">Recent Service Requests</h3>
            <Link to="/admin/services" className="text-sm font-medium text-primary hover:underline">View All</Link>
          </div>
          <div className="flex-1 overflow-hidden">
            {(!metrics.recentRequests || metrics.recentRequests.length === 0) ? (
              <div className="p-6 h-full flex flex-col items-center justify-center text-center">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Wrench className="h-8 w-8 text-muted-foreground" />
                </div>
                <h4 className="text-base font-medium text-foreground mb-1">No recent requests</h4>
                <p className="text-sm text-muted-foreground">Service requests will appear here once they are submitted.</p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {metrics.recentRequests.map((request: any) => (
                  <li key={request.id} className="p-4 hover:bg-muted/20 transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-foreground">{request.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">Customer: {request.customer?.user?.name}</p>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        request.status === 'COMPLETED' ? 'bg-green-100 text-green-700 border-green-200' :
                        request.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                        'bg-amber-100 text-amber-700 border-amber-200'
                      }`}>
                        {request.status.replace('_', ' ')}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
