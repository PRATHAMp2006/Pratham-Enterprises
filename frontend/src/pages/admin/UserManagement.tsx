import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { UserPlus, Search, Trash2, Shield, Wrench, User, Building, Loader2, X, Edit2, Eye, EyeOff } from 'lucide-react';

interface UserData {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  createdAt: string;
  aadharNumber?: string;
  bloodGroup?: string;
  homeAddress?: string;
  permanentAddress?: string;
  personalEmail?: string;
  personalPhone?: string;
}

export default function UserManagement() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const canDelete = user?.role === 'ADMIN';
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'TECHNICIAN',
    createdAt: '',
    aadharNumber: '',
    bloodGroup: '',
    homeAddress: '',
    permanentAddress: '',
    personalEmail: '',
    personalPhone: ''
  });
  const [formError, setFormError] = useState('');

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    
    setIsDeleting(id);
    try {
      await api.delete(`/users/${id}`);
      setUsers(users.filter(u => u.id !== id));
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('Failed to delete user. Please try again.');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleEditClick = (user: UserData) => {
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      password: '',
      role: user.role,
      createdAt: user.createdAt.split('T')[0],
      aadharNumber: user.aadharNumber || '',
      bloodGroup: user.bloodGroup || '',
      homeAddress: user.homeAddress || '',
      permanentAddress: user.permanentAddress || '',
      personalEmail: user.personalEmail || '',
      personalPhone: user.personalPhone || ''
    });
    setEditingUserId(user.id);
    setIsModalOpen(true);
  };

  const handleCreateOrUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError('');

    try {
      if (editingUserId) {
        // Update existing user
        const updateData: any = {
          name: formData.name,
          phone: formData.phone,
          role: formData.role,
          createdAt: formData.createdAt,
          aadharNumber: formData.aadharNumber,
          bloodGroup: formData.bloodGroup,
          homeAddress: formData.homeAddress,
          permanentAddress: formData.permanentAddress,
          personalEmail: formData.personalEmail,
          personalPhone: formData.personalPhone
        };
        if (formData.password) {
          updateData.password = formData.password;
        }
        await api.put(`/users/${editingUserId}`, updateData);
      } else {
        // Create new user (staff only)
        if (formData.role === 'TECHNICIAN') {
          await api.post('/users/technician', {
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            password: formData.password
          });
        } else {
          // You'd need an endpoint for creating ADMIN/CRM/MANAGER. 
          // For now, let's assume /auth/register handles it if properly secured.
          await api.post('/auth/register', formData);
        }
      }
      
      // Refresh the list and close modal
      await fetchUsers();
      closeModal();
    } catch (error: any) {
      setFormError(error.response?.data?.message || `Failed to ${editingUserId ? 'update' : 'create'} user. Please check all fields.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUserId(null);
    setShowPassword(false);
    setFormData({ name: '', email: '', phone: '', password: '', role: 'TECHNICIAN', createdAt: '', aadharNumber: '', bloodGroup: '', homeAddress: '', permanentAddress: '', personalEmail: '', personalPhone: '' });
    setFormError('');
  };

  const filteredUsers = users.filter(user => 
    user.role !== 'CUSTOMER' && (
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'ADMIN': return <Shield className="h-4 w-4 text-rose-500" />;
      case 'MANAGER': return <Building className="h-4 w-4 text-purple-500" />;
      case 'CRM': return <Building className="h-4 w-4 text-blue-500" />;
      case 'TECHNICIAN': return <Wrench className="h-4 w-4 text-amber-500" />;
      default: return <User className="h-4 w-4 text-slate-500" />;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'MANAGER': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'CRM': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'TECHNICIAN': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">User Management</h1>
          <p className="text-muted-foreground mt-1">Manage system access, customers, and technicians.</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => {
              setEditingUserId(null);
              setFormData({ 
      name: '', email: '', phone: '', password: '', role: 'TECHNICIAN', createdAt: '',
      aadharNumber: '', bloodGroup: '', homeAddress: '', permanentAddress: '', personalEmail: '', personalPhone: '' 
    });
              setIsModalOpen(true);
            }}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-primary text-primary-foreground hover:bg-primary/90 h-10 py-2 px-4 shadow-sm"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Add User
          </button>
        )}
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
              placeholder="Search users by name, email, or role..."
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
                <th scope="col" className="px-6 py-3 font-medium">User</th>
                <th scope="col" className="px-6 py-3 font-medium">Role</th>
                <th scope="col" className="px-6 py-3 font-medium">Phone</th>
                <th scope="col" className="px-6 py-3 font-medium">Joined Date</th>
                <th scope="col" className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Loading users...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    No users found matching your search.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="bg-card hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-foreground">{user.name}</div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getRoleBadge(user.role)}`}>
                        <span className="mr-1">{getRoleIcon(user.role)}</span>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {user.phone || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {isAdmin ? (
                        <div className="flex items-center justify-end space-x-3">
                          <button 
                            onClick={() => handleEditClick(user)}
                            className="text-muted-foreground hover:text-primary transition-colors flex items-center"
                            title="Edit User"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          {canDelete && (
                            <button 
                              onClick={() => handleDelete(user.id)}
                              disabled={isDeleting === user.id}
                              className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50 flex items-center"
                              title="Delete User"
                            >
                              {isDeleting === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </button>
                          )}
                        </div>
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

      {/* Add/Edit User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity" onClick={closeModal}></div>
          <div className="bg-card rounded-xl shadow-lg border border-border w-full max-w-lg z-10 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-border shrink-0">
              <h2 className="text-xl font-bold">{editingUserId ? 'Edit User' : 'Add New User'}</h2>
              <button type="button" onClick={closeModal} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateOrUpdateUser} className="p-6 space-y-4 overflow-y-auto">
              {formError && (
                <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md border border-destructive/20">
                  {formError}
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Full Name</label>
                  <input 
                    required 
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary" 
                    placeholder="John Doe" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Phone Number</label>
                  <input 
                    required 
                    type="tel" 
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary" 
                    placeholder="9876543210" 
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Email Address</label>
                <input 
                  required 
                  type="email" 
                  value={formData.email}
                  disabled={!!editingUserId}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-50 disabled:bg-muted" 
                  placeholder="john@example.com" 
                />
                {editingUserId && <p className="text-xs text-muted-foreground">Email cannot be changed.</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Role</label>
                  <select 
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-50 disabled:bg-muted"
                  >
                    <option value="TECHNICIAN">Technician</option>
                    <option value="CRM">CRM Staff</option>
                    <option value="MANAGER">Manager</option>
                    <option value="ADMIN">Administrator</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Password {editingUserId && <span className="text-xs text-muted-foreground font-normal">(Leave blank to keep current)</span>}</label>
                  <div className="relative">
                    <input 
                      required={!editingUserId}
                      type={showPassword ? "text" : "password"} 
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary pr-10" 
                      placeholder={editingUserId ? "Enter new password to change" : "••••••••"} 
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {editingUserId && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Joined Date</label>
                  <input 
                    type="date" 
                    value={formData.createdAt}
                    onChange={(e) => setFormData({...formData, createdAt: e.target.value})}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary" 
                  />
                </div>
              )}

              <hr className="my-6 border-border" />
              <h3 className="text-lg font-semibold mb-4">Personal Details</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Aadhar Number</label>
                  <input 
                    type="text" 
                    value={formData.aadharNumber}
                    onChange={(e) => setFormData({...formData, aadharNumber: e.target.value})}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary" 
                    placeholder="1234 5678 9012" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Blood Group</label>
                  <select 
                    value={formData.bloodGroup}
                    onChange={(e) => setFormData({...formData, bloodGroup: e.target.value})}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="">Select Blood Group</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Personal Email</label>
                  <input 
                    type="email" 
                    value={formData.personalEmail}
                    onChange={(e) => setFormData({...formData, personalEmail: e.target.value})}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary" 
                    placeholder="personal@gmail.com" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Personal Phone</label>
                  <input 
                    type="tel" 
                    value={formData.personalPhone}
                    onChange={(e) => setFormData({...formData, personalPhone: e.target.value})}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary" 
                    placeholder="+91 9876543210" 
                  />
                </div>
              </div>

              <div className="space-y-2 mt-4">
                <label className="text-sm font-medium">Residential Address</label>
                <textarea 
                  value={formData.homeAddress}
                  onChange={(e) => setFormData({...formData, homeAddress: e.target.value})}
                  className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary" 
                  placeholder="Current residential address..." 
                />
              </div>

              <div className="space-y-2 mt-4">
                <label className="text-sm font-medium">Permanent Address</label>
                <textarea 
                  value={formData.permanentAddress}
                  onChange={(e) => setFormData({...formData, permanentAddress: e.target.value})}
                  className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary" 
                  placeholder="Permanent address..." 
                />
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button 
                  type="button" 
                  onClick={closeModal}
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
                  {editingUserId ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
