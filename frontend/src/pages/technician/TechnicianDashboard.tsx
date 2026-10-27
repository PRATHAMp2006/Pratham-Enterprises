import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/api';
import { CheckCircle, Clock, MapPin, Calendar, Loader2, Phone, User, LogIn, LogOut, X, PenTool } from 'lucide-react';
import { useRef } from 'react';

function SignatureCanvas({ onSave }: { onSave: (dataUrl: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let x, y;
    if ('touches' in e) {
      const rect = canvas.getBoundingClientRect();
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.nativeEvent.offsetX;
      y = e.nativeEvent.offsetY;
    }
    
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let x, y;
    if ('touches' in e) {
      const rect = canvas.getBoundingClientRect();
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.nativeEvent.offsetX;
      y = e.nativeEvent.offsetY;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDrawing = () => {
    setIsDrawing(false);
    if (canvasRef.current) {
      onSave(canvasRef.current.toDataURL());
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      onSave('');
    }
  };

  return (
    <div className="border border-border rounded-md bg-background overflow-hidden relative">
      <canvas 
        ref={canvasRef}
        width={400}
        height={150}
        className="w-full h-[150px] touch-none cursor-crosshair bg-white"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={endDrawing}
        onMouseLeave={endDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={endDrawing}
      />
      <button 
        type="button" 
        onClick={clear} 
        className="absolute bottom-2 right-2 text-xs bg-slate-200 text-slate-700 px-2 py-1 rounded shadow-sm hover:bg-slate-300"
      >
        Clear
      </button>
    </div>
  );
}

interface ServiceRequestData {
  id: string;
  description: string;
  status: string;
  createdAt: string;
  scheduledDate: string;
  customer: {
    address: string;
    user: { name: string; phone: string };
  };
  serviceReport?: {
    partsReplaced?: string | null;
    partNumber?: string | null;
    notes?: string | null;
    customerSignature?: string | null;
    createdAt?: string;
  };
}

export default function TechnicianDashboard() {
  const { user } = useAuthStore();
  const [isPunchedIn, setIsPunchedIn] = useState(false);
  const [tasks, setTasks] = useState<ServiceRequestData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [historyFilter, setHistoryFilter] = useState('all');

  // Completion Modal State
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [completionForm, setCompletionForm] = useState({
    notes: '',
    otp: '',
    customerSignature: ''
  });
  const [replacedParts, setReplacedParts] = useState([{ name: '', number: '' }]);
  const [completionError, setCompletionError] = useState('');

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/services');
      setTasks(response.data);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    setIsUpdating(id);
    try {
      await api.put(`/services/${id}/status`, { status: newStatus, notes: 'Started by technician via portal' });
      await fetchTasks();
    } catch (error) {
      console.error('Failed to update task:', error);
      alert('Failed to update task status.');
    } finally {
      setIsUpdating(null);
    }
  };

  const handleOpenCompletionModal = (id: string) => {
    setSelectedTaskId(id);
    setCompletionForm({ notes: '', otp: '', customerSignature: '' });
    setReplacedParts([{ name: '', number: '' }]);
    setCompletionError('');
    setIsCompletionModalOpen(true);
  };

  const handleAddPart = () => {
    setReplacedParts([...replacedParts, { name: '', number: '' }]);
  };

  const handleRemovePart = (index: number) => {
    const newParts = [...replacedParts];
    newParts.splice(index, 1);
    setReplacedParts(newParts);
  };

  const handlePartChange = (index: number, field: 'name' | 'number', value: string) => {
    const newParts = [...replacedParts];
    newParts[index][field] = value;
    setReplacedParts(newParts);
  };

  const handleCompleteJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskId) return;

    if (!completionForm.customerSignature) {
      setCompletionError('Customer signature is required.');
      return;
    }

    setIsUpdating(selectedTaskId);
    setCompletionError('');

    const validParts = replacedParts.filter(p => p.name.trim() !== '');
    const partsReplacedString = validParts.map(p => p.name.trim()).join(', ');
    const partNumberString = validParts.map(p => p.number.trim()).join(', ');

    try {
      await api.put(`/services/${selectedTaskId}/status`, { 
        status: 'COMPLETED',
        partsReplaced: partsReplacedString,
        partNumber: partNumberString,
        ...completionForm
      });
      await fetchTasks();
      setIsCompletionModalOpen(false);
    } catch (error: any) {
      console.error('Failed to complete job:', error);
      setCompletionError(error.response?.data?.message || 'Failed to complete job. Check OTP.');
    } finally {
      setIsUpdating(null);
    }
  };

  const activeTasks = tasks.filter(t => t.status === 'IN_PROGRESS' || t.status === 'PENDING');
  const completedTasks = tasks.filter(t => t.status === 'COMPLETED');

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const assignedToday = tasks.filter(t => new Date(t.createdAt) >= todayStart);
  const completedToday = completedTasks.filter(t => new Date(t.serviceReport?.createdAt || t.createdAt) >= todayStart);

  const getFilteredHistory = () => {
    let completed = completedTasks;
    const now = new Date();
    if (historyFilter === 'today') {
      const start = new Date(now.setHours(0,0,0,0));
      completed = completed.filter(t => new Date(t.serviceReport?.createdAt || t.createdAt) >= start);
    } else if (historyFilter === '1month') {
      const start = new Date(now.setMonth(now.getMonth() - 1));
      completed = completed.filter(t => new Date(t.serviceReport?.createdAt || t.createdAt) >= start);
    } else if (historyFilter === '2months') {
      const start = new Date(now.setMonth(now.getMonth() - 2));
      completed = completed.filter(t => new Date(t.serviceReport?.createdAt || t.createdAt) >= start);
    }
    return completed;
  };

  const filteredCompletedTasks = getFilteredHistory();

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Technician Portal</h1>
          <p className="text-muted-foreground mt-1">Welcome back, {user?.name}. Here are your assigned tasks.</p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={() => setIsPunchedIn(!isPunchedIn)}
            className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors h-10 px-4 py-2 shadow-sm border ${
              isPunchedIn 
                ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' 
                : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
            }`}
          >
            {isPunchedIn ? <LogOut className="mr-2 w-4 h-4" /> : <LogIn className="mr-2 w-4 h-4" />}
            {isPunchedIn ? 'Punch Out' : 'Punch In'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card border border-border rounded-xl shadow-sm p-6 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
            <Clock className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-2xl font-bold">{assignedToday.length}</h3>
          <p className="text-muted-foreground font-medium">Jobs Assigned Today</p>
        </div>
        <div className="bg-card border border-border rounded-xl shadow-sm p-6 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-2xl font-bold">{completedToday.length}</h3>
          <p className="text-muted-foreground font-medium">Jobs Completed Today</p>
        </div>
        <div className="bg-card border border-border rounded-xl shadow-sm p-6 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-purple-600" />
          </div>
          <h3 className="text-2xl font-bold">{completedTasks.length}</h3>
          <p className="text-muted-foreground font-medium">Jobs Completed Till Now</p>
        </div>
      </div>

      <div className="space-y-4 mt-8">
        <h2 className="text-xl font-bold tracking-tight border-b border-border pb-2">Your Assigned Tasks</h2>
        
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin mb-4" />
            <p>Loading your assignments...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center bg-muted/20 rounded-xl border border-border border-dashed">
            <CheckCircle className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">No tasks assigned</h3>
            <p className="text-muted-foreground">You're all caught up for now!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {activeTasks.map((task) => (
              <div key={task.id} className="bg-card border border-border rounded-xl shadow-sm p-5 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200 mb-2">
                      In Progress
                    </span>
                    <h3 className="font-semibold text-lg line-clamp-2">{task.description}</h3>
                  </div>
                </div>
                
                <div className="space-y-2 mt-auto pt-4 border-t border-border">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <User className="w-4 h-4 mr-2" />
                    <span className="font-medium text-foreground mr-2">{task.customer?.user?.name}</span>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Phone className="w-4 h-4 mr-2" />
                    {task.customer?.user?.phone}
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4 mr-2" />
                    <span className="line-clamp-1">{task.customer?.address || 'Address not provided'}</span>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4 mr-2" />
                    {task.scheduledDate ? new Date(task.scheduledDate).toLocaleDateString() : 'Unscheduled'}
                  </div>
                </div>

                <div className="mt-6 flex space-x-2">
                  {task.status === 'PENDING' ? (
                    <button 
                      onClick={() => handleStatusUpdate(task.id, 'IN_PROGRESS')}
                      disabled={isUpdating === task.id}
                      className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none disabled:opacity-50 h-10 py-2 px-4 shadow-sm bg-blue-600 text-white hover:bg-blue-700"
                    >
                      {isUpdating === task.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PenTool className="mr-2 h-4 w-4" />}
                      Start Job
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleOpenCompletionModal(task.id)}
                      disabled={isUpdating === task.id}
                      className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none disabled:opacity-50 h-10 py-2 px-4 shadow-sm bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      {isUpdating === task.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                      Complete Job
                    </button>
                  )}
                </div>
              </div>
            ))}
            
            {completedTasks.length > 0 && activeTasks.length === 0 && (
              <div className="col-span-full py-12 flex flex-col items-center justify-center text-muted-foreground bg-green-50/50 rounded-xl border border-green-100 border-dashed">
                <CheckCircle className="w-12 h-12 text-green-500/50 mb-4" />
                <h3 className="text-lg font-medium text-green-800">All Done!</h3>
                <p>You have completed all your assigned tasks.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {completedTasks.length > 0 && (
        <div className="space-y-4 mt-12 border-t border-border pt-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2">
            <h2 className="text-xl font-bold tracking-tight">Completed Jobs History</h2>
            <select
              value={historyFilter}
              onChange={(e) => setHistoryFilter(e.target.value)}
              className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="today">Today</option>
              <option value="1month">Past 1 Month</option>
              <option value="2months">Past 2 Months</option>
              <option value="all">All Time</option>
            </select>
          </div>
          
          {filteredCompletedTasks.length === 0 ? (
            <div className="py-8 flex flex-col items-center justify-center text-muted-foreground bg-muted/10 rounded-xl border border-border">
              <p>No completed jobs found for this time period.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredCompletedTasks.map((task) => (
              <div key={task.id} className="bg-muted/30 border border-border rounded-xl shadow-sm p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                      Completed
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {task.scheduledDate ? new Date(task.scheduledDate).toLocaleDateString() : 'Unscheduled'}
                    </span>
                  </div>
                  <h3 className="font-semibold text-lg">{task.description}</h3>
                  <div className="flex flex-col sm:flex-row sm:items-center text-sm text-muted-foreground gap-2 sm:gap-6">
                    <span className="flex items-center"><User className="w-4 h-4 mr-1" /> {task.customer?.user?.name}</span>
                    <span className="flex items-center"><Phone className="w-4 h-4 mr-1" /> {task.customer?.user?.phone}</span>
                    <span className="flex items-center"><MapPin className="w-4 h-4 mr-1" /> {task.customer?.address}</span>
                  </div>
                </div>
                
                {task.serviceReport && (
                  <div className="bg-background border border-border p-3 rounded-lg text-sm w-full sm:w-72 flex-shrink-0">
                    <h4 className="font-semibold text-xs uppercase text-muted-foreground mb-2">Service Report</h4>
                    <p><span className="font-medium">Parts:</span> {task.serviceReport.partsReplaced || 'None'}</p>
                    <p><span className="font-medium">PN:</span> {task.serviceReport.partNumber || 'N/A'}</p>
                    <p className="line-clamp-2 mt-1"><span className="font-medium">Notes:</span> {task.serviceReport.notes || 'No notes'}</p>
                  </div>
                )}
              </div>
            ))}
            </div>
          )}
        </div>
      )}

      {/* Completion Modal */}
      {isCompletionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity" onClick={() => setIsCompletionModalOpen(false)}></div>
          <div className="bg-card rounded-xl shadow-lg border border-border w-full max-w-lg z-10 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-border shrink-0">
              <h2 className="text-xl font-bold">Complete Job</h2>
              <button type="button" onClick={() => setIsCompletionModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleCompleteJob} className="p-6 space-y-4 overflow-y-auto">
              {completionError && (
                <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md border border-destructive/20">
                  {completionError}
                </div>
              )}
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium">Parts Replaced</label>
                  <button 
                    type="button" 
                    onClick={handleAddPart}
                    className="text-xs text-primary font-medium hover:underline flex items-center"
                  >
                    + Add Another Part
                  </button>
                </div>
                
                {replacedParts.map((part, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input 
                      type="text"
                      value={part.name}
                      onChange={(e) => handlePartChange(index, 'name', e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                      placeholder="Part Name (e.g. Motor)"
                    />
                    <input 
                      type="text"
                      value={part.number}
                      onChange={(e) => handlePartChange(index, 'number', e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                      placeholder="Part No. (Optional)"
                    />
                    {replacedParts.length > 1 && (
                      <button 
                        type="button" 
                        onClick={() => handleRemovePart(index)}
                        className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Technician Feedback</label>
                <textarea 
                  value={completionForm.notes}
                  onChange={(e) => setCompletionForm({...completionForm, notes: e.target.value})}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Provide any feedback or notes about the service..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-amber-600">Customer OTP (Required)</label>
                <input 
                  required
                  type="text"
                  maxLength={4}
                  value={completionForm.otp}
                  onChange={(e) => setCompletionForm({...completionForm, otp: e.target.value})}
                  className="flex h-10 w-full rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-bold tracking-widest text-center"
                  placeholder="Ask customer for 4-digit OTP"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Customer Digital Signature</label>
                <SignatureCanvas onSave={(data) => setCompletionForm({...completionForm, customerSignature: data})} />
                <p className="text-xs text-muted-foreground mt-1">Have the customer sign in the box above to acknowledge completion.</p>
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button 
                  type="button" 
                  onClick={() => setIsCompletionModalOpen(false)}
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors border border-input bg-background hover:bg-muted hover:text-foreground h-10 px-4 py-2"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isUpdating === selectedTaskId}
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 disabled:opacity-50"
                >
                  {isUpdating === selectedTaskId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                  Submit & Complete
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
