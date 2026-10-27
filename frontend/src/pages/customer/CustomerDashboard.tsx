import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/api';
import { Plus, Clock, FileText, Wrench, Loader2, X } from 'lucide-react';

export default function CustomerDashboard() {
  const { user } = useAuthStore();
  const [requests, setRequests] = useState<any[]>([]);
  const [activeRequests, setActiveRequests] = useState(0);
  const [completedServices, setCompletedServices] = useState(0);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    scheduledDate: ''
  });
  const [formError, setFormError] = useState('');

  const fetchStats = async () => {
    try {
      const res = await api.get('/services');
      const data: any[] = res.data;
      setRequests(data);
      const active = data.filter(r => r.status === 'PENDING' || r.status === 'IN_PROGRESS').length;
      const completed = data.filter(r => r.status === 'COMPLETED').length;
      setActiveRequests(active);
      setCompletedServices(completed);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleRaiseRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError('');

    try {
      await api.post('/services', formData);
      await fetchStats();
      setIsModalOpen(false);
      setFormData({ description: '', scheduledDate: '' });
      // Optionally trigger a success toast here
    } catch (error: any) {
      setFormError(error.response?.data?.message || 'Failed to raise request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome back, {user?.name}</h1>
          <p className="text-muted-foreground mt-1">View your services and raise new requests.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 h-10 py-2 px-4 shadow-sm bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          Raise Request
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="relative overflow-hidden rounded-xl bg-card border border-border p-6 shadow-sm">
          <div className="flex items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Active Requests</p>
              <p className="text-2xl font-bold text-foreground">{activeRequests}</p>
            </div>
          </div>
        </div>
        
        <div className="relative overflow-hidden rounded-xl bg-card border border-border p-6 shadow-sm">
          <div className="flex items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
              <Wrench className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Completed Services</p>
              <p className="text-2xl font-bold text-foreground">{completedServices}</p>
            </div>
          </div>
        </div>
        
        <div className="relative overflow-hidden rounded-xl bg-card border border-border p-6 shadow-sm">
          <div className="flex items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100">
              <FileText className="h-6 w-6 text-slate-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Unpaid Invoices</p>
              <p className="text-2xl font-bold text-foreground">0</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm flex flex-col mt-8">
        <div className="border-b border-border px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-medium text-foreground">My Service History</h3>
        </div>
        <div className="p-6">
          {requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-8">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Wrench className="h-8 w-8 text-muted-foreground" />
              </div>
              <h4 className="text-base font-medium text-foreground mb-1">No service history</h4>
              <p className="text-sm text-muted-foreground">When you raise a service request, it will appear here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map(request => (
                <div key={request.id} className="flex flex-col p-4 border border-border rounded-lg bg-background space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                    <div>
                      <h4 className="font-medium">{request.description}</h4>
                      <p className="text-sm text-muted-foreground mt-1">Requested on: {new Date(request.createdAt).toLocaleDateString()}</p>
                      {request.status === 'IN_PROGRESS' && request.otpCode && (
                        <div className="mt-2 inline-flex items-center px-2.5 py-1.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-sm font-semibold tracking-widest">
                          OTP: {request.otpCode}
                        </div>
                      )}
                      {request.status === 'PENDING' && request.otpCode && (
                        <div className="mt-2 inline-flex items-center px-2.5 py-1.5 rounded-md bg-slate-50 border border-slate-200 text-slate-800 text-sm font-semibold tracking-widest">
                          OTP: {request.otpCode}
                        </div>
                      )}
                    </div>
                    <div className="mt-4 sm:mt-0">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        request.status === 'COMPLETED' ? 'bg-green-100 text-green-800 border-green-200' :
                        request.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                        'bg-slate-100 text-slate-800 border-slate-200'
                      }`}>
                        {request.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  
                  {request.status === 'COMPLETED' && request.serviceReport && (
                    <div className="bg-muted/50 border border-border rounded-lg p-4 mt-2">
                      <h5 className="text-sm font-semibold mb-2">Service Report Details</h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground block text-xs uppercase tracking-wider">Parts Replaced</span>
                          <span className="font-medium">{request.serviceReport.partsReplaced || 'None'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-xs uppercase tracking-wider">Part Number</span>
                          <span className="font-medium">{request.serviceReport.partNumber || 'N/A'}</span>
                        </div>
                        <div className="col-span-full">
                          <span className="text-muted-foreground block text-xs uppercase tracking-wider">Technician Notes</span>
                          <span className="font-medium">{request.serviceReport.notes || 'No notes provided'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Raise Request Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity" onClick={() => setIsModalOpen(false)}></div>
          <div className="bg-card rounded-xl shadow-lg border border-border w-full max-w-lg z-10 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-border">
              <h2 className="text-xl font-bold">Raise New Request</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleRaiseRequest} className="p-6 space-y-4">
              {formError && (
                <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md border border-destructive/20">
                  {formError}
                </div>
              )}
              
              <div className="space-y-2">
                <label className="text-sm font-medium">What do you need help with?</label>
                <textarea 
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary" 
                  placeholder="E.g. My AC is making a strange noise and not cooling properly..." 
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Preferred Date (Optional)</label>
                <input 
                  type="date" 
                  value={formData.scheduledDate}
                  onChange={(e) => setFormData({...formData, scheduledDate: e.target.value})}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary" 
                />
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors border border-input bg-background hover:bg-muted hover:text-foreground h-10 px-4 py-2"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
