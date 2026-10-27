import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { Search, Wrench, Clock, CheckCircle, AlertCircle, Loader2, Calendar, X } from 'lucide-react';

interface ServiceRequestData {
  id: string;
  description: string;
  status: string;
  scheduledDate: string;
  createdAt: string;
  customer: {
    user: { name: string; email: string; phone: string };
  };
  technician: {
    user: { name: string };
  } | null;
}

interface TechnicianProfileData {
  technicianId: string;
  user: {
    name: string;
    phone: string;
  }
}

export default function ServiceRequests() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const [requests, setRequests] = useState<ServiceRequestData[]>([]);
  const [technicians, setTechnicians] = useState<TechnicianProfileData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Assign Technician Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState('');
  const [assignError, setAssignError] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [reqRes, techRes] = await Promise.all([
        api.get('/services'),
        api.get('/users/technicians')
      ]);
      setRequests(reqRes.data);
      setTechnicians(techRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAssignClick = (requestId: string) => {
    setSelectedRequestId(requestId);
    setSelectedTechnicianId('');
    setAssignError('');
    setIsAssignModalOpen(true);
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequestId || !selectedTechnicianId) return;
    
    setIsSubmitting(true);
    setAssignError('');

    try {
      await api.put(`/services/${selectedRequestId}/assign`, { technicianId: selectedTechnicianId });
      
      // Also update status to IN_PROGRESS if it was PENDING
      const req = requests.find(r => r.id === selectedRequestId);
      if (req && req.status === 'PENDING') {
         await api.put(`/services/${selectedRequestId}/status`, { status: 'IN_PROGRESS' });
      }

      await fetchData();
      setIsAssignModalOpen(false);
    } catch (error: any) {
      setAssignError(error.response?.data?.message || 'Failed to assign technician.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredRequests = requests.filter(req => 
    req.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (req.customer?.user?.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200"><AlertCircle className="w-3 h-3 mr-1" /> Pending</span>;
      case 'IN_PROGRESS':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200"><Clock className="w-3 h-3 mr-1" /> In Progress</span>;
      case 'COMPLETED':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200"><CheckCircle className="w-3 h-3 mr-1" /> Completed</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Service Requests</h1>
          <p className="text-muted-foreground mt-1">Track and manage customer service requests.</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
          <div className="relative w-full max-w-sm">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="h-4 w-4 text-muted-foreground" />
            </div>
            <input
              type="text"
              placeholder="Search requests or customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full rounded-md border border-input bg-background py-2 pl-10 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/40 border-b border-border">
              <tr>
                <th scope="col" className="px-6 py-3 font-medium">Customer</th>
                <th scope="col" className="px-6 py-3 font-medium">Request Detail</th>
                <th scope="col" className="px-6 py-3 font-medium">Status</th>
                <th scope="col" className="px-6 py-3 font-medium">Technician</th>
                <th scope="col" className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Loading requests...
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    No service requests found.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((request) => (
                  <tr key={request.id} className="bg-card hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-foreground">{request.customer?.user?.name || 'Unknown'}</div>
                      <div className="text-xs text-muted-foreground">{request.customer?.user?.phone || 'No phone'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-foreground truncate max-w-[250px]">{request.description}</div>
                      <div className="flex items-center text-xs text-muted-foreground mt-1">
                        <Calendar className="w-3 h-3 mr-1" />
                        {request.scheduledDate ? new Date(request.scheduledDate).toLocaleDateString() : 'Not Scheduled'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(request.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {request.technician ? (
                        <div className="flex items-center">
                          <Wrench className="w-4 h-4 mr-1.5 text-primary" />
                          <span className="font-medium text-foreground">{request.technician.user.name}</span>
                        </div>
                      ) : (
                        <span className="text-amber-600 font-medium text-xs bg-amber-100 px-2 py-1 rounded">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {isAdmin ? (
                        <button 
                          onClick={() => handleAssignClick(request.id)}
                          className="text-primary hover:underline transition-colors font-semibold"
                        >
                          {request.technician ? 'Reassign' : 'Assign Tech'}
                        </button>
                      ) : (
                        <span className="text-muted-foreground text-xs italic">View Only</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assign Technician Modal */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity" onClick={() => setIsAssignModalOpen(false)}></div>
          <div className="bg-card rounded-xl shadow-lg border border-border w-full max-w-sm z-10 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-border">
              <h2 className="text-xl font-bold">Assign Technician</h2>
              <button onClick={() => setIsAssignModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleAssignSubmit} className="p-6 space-y-4">
              {assignError && (
                <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md border border-destructive/20">
                  {assignError}
                </div>
              )}
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Select a Technician</label>
                <select 
                  required
                  value={selectedTechnicianId}
                  onChange={(e) => setSelectedTechnicianId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="" disabled>-- Select a Technician --</option>
                  {technicians.map((tech) => (
                    <option key={tech.technicianId} value={tech.technicianId}>
                      {tech.user.name} ({tech.user.phone})
                    </option>
                  ))}
                </select>
                {technicians.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">No technicians available. Add one in User Management.</p>
                )}
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button 
                  type="button" 
                  onClick={() => setIsAssignModalOpen(false)}
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors border border-input bg-background hover:bg-muted hover:text-foreground h-10 px-4 py-2"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting || technicians.length === 0}
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
