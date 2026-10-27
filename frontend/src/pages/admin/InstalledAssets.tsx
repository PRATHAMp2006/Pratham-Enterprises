import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import {
  HardDrive,
  Search,
  Plus,
  Edit2,
  Eye,
  Loader2,
  Calendar,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Phone,
  MapPin,
  X,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';

interface InstalledAsset {
  id: string;
  customerId: string;
  productId: string | null;
  modelName: string;
  serialNumber: string | null;
  installationDate: string;
  warrantyStartDate: string | null;
  warrantyEndDate: string | null;
  installationAddress: string;
  installationNotes: string | null;
  status: string;
  installedByTechId: string | null;
  customer?: {
    customerId: string;
    address: string;
    user?: {
      name: string;
      phone: string;
      email: string;
    };
  };
  product?: {
    id: string;
    name: string;
    price: number;
  } | null;
  installedBy?: {
    technicianId: string;
    user?: {
      name: string;
      phone: string;
    };
  } | null;
  computedWarranty?: {
    status: string;
    daysRemaining: number | null;
  };
  _count?: {
    amcContracts: number;
    serviceRequests: number;
    serviceSchedules: number;
  };
}

interface CustomerOption {
  customerId: string;
  address: string;
  user: {
    name: string;
    phone: string;
    email: string;
  };
}

interface ProductOption {
  id: string;
  name: string;
  price: number;
}

interface TechOption {
  technicianId: string;
  user: {
    name: string;
    phone: string;
  };
}

export default function InstalledAssets() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const isManagerOrAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'CRM';

  const [assets, setAssets] = useState<InstalledAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [warrantyFilter, setWarrantyFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // Dropdown reference data
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [technicians, setTechnicians] = useState<TechOption[]>([]);

  // Form State
  const [formData, setFormData] = useState({
    customerId: '',
    productId: '',
    modelName: '',
    serialNumber: '',
    installationDate: new Date().toISOString().split('T')[0],
    warrantyStartDate: new Date().toISOString().split('T')[0],
    warrantyEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    installationAddress: '',
    installationNotes: '',
    status: 'ACTIVE',
    installedByTechId: '',
  });

  const fetchAssets = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (warrantyFilter !== 'ALL') params.append('warrantyStatus', warrantyFilter);
      params.append('page', page.toString());
      params.append('limit', '8');

      const response = await api.get(`/installed-assets?${params.toString()}`);
      setAssets(response.data.data || []);
      setTotalPages(response.data.pagination?.totalPages || 1);
      setTotalCount(response.data.pagination?.total || 0);
    } catch (error) {
      console.error('Failed to fetch installed assets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDropdownData = async () => {
    try {
      const [custRes, prodRes, techRes] = await Promise.all([
        api.get('/users/customers'),
        api.get('/products?type=PRODUCT'),
        api.get('/users/technicians'),
      ]);
      setCustomers(custRes.data || []);
      setProducts(prodRes.data || []);
      setTechnicians(techRes.data || []);
    } catch (error) {
      console.error('Failed to load dropdown metadata:', error);
    }
  };

  useEffect(() => {
    fetchDropdownData();
  }, []);

  useEffect(() => {
    fetchAssets();
  }, [page, statusFilter, warrantyFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchAssets();
  };

  const openCreateModal = () => {
    setEditingAssetId(null);
    setFormData({
      customerId: customers.length > 0 ? customers[0].customerId : '',
      productId: '',
      modelName: '',
      serialNumber: '',
      installationDate: new Date().toISOString().split('T')[0],
      warrantyStartDate: new Date().toISOString().split('T')[0],
      warrantyEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      installationAddress: customers.length > 0 ? customers[0].address : '',
      installationNotes: '',
      status: 'ACTIVE',
      installedByTechId: '',
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const openEditModal = (asset: InstalledAsset) => {
    setEditingAssetId(asset.id);
    setFormData({
      customerId: asset.customerId,
      productId: asset.productId || '',
      modelName: asset.modelName,
      serialNumber: asset.serialNumber || '',
      installationDate: asset.installationDate ? asset.installationDate.split('T')[0] : '',
      warrantyStartDate: asset.warrantyStartDate ? asset.warrantyStartDate.split('T')[0] : '',
      warrantyEndDate: asset.warrantyEndDate ? asset.warrantyEndDate.split('T')[0] : '',
      installationAddress: asset.installationAddress,
      installationNotes: asset.installationNotes || '',
      status: asset.status,
      installedByTechId: asset.installedByTechId || '',
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleCustomerChange = (selectedCustId: string) => {
    const cust = customers.find((c) => c.customerId === selectedCustId);
    setFormData((prev) => ({
      ...prev,
      customerId: selectedCustId,
      installationAddress: cust ? cust.address : prev.installationAddress,
    }));
  };

  const handleProductChange = (selectedProdId: string) => {
    const prod = products.find((p) => p.id === selectedProdId);
    setFormData((prev) => ({
      ...prev,
      productId: selectedProdId,
      modelName: prod ? prod.name : prev.modelName,
    }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setModalError('');

    try {
      const payload = {
        ...formData,
        serialNumber: formData.serialNumber.trim() ? formData.serialNumber.trim() : null,
        productId: formData.productId ? formData.productId : null,
        installedByTechId: formData.installedByTechId ? formData.installedByTechId : null,
        warrantyStartDate: formData.warrantyStartDate ? formData.warrantyStartDate : null,
        warrantyEndDate: formData.warrantyEndDate ? formData.warrantyEndDate : null,
      };

      if (editingAssetId) {
        await api.put(`/installed-assets/${editingAssetId}`, payload);
      } else {
        await api.post('/installed-assets', payload);
      }

      setIsModalOpen(false);
      await fetchAssets();
    } catch (error: any) {
      setModalError(
        error.response?.data?.message || 'Failed to save installed asset. Please check the provided details.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const getWarrantyBadge = (asset: InstalledAsset) => {
    const status = asset.computedWarranty?.status;
    const days = asset.computedWarranty?.daysRemaining;

    if (status === 'ACTIVE') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
          <ShieldCheck className="w-3 h-3 mr-1" />
          Active ({days}d left)
        </span>
      );
    }
    if (status === 'EXPIRED') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800 border border-rose-200">
          <ShieldAlert className="w-3 h-3 mr-1" />
          Expired
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">
        <Shield className="w-3 h-3 mr-1" />
        No Warranty
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
            Active
          </span>
        );
      case 'UNDER_MAINTENANCE':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
            In Service
          </span>
        );
      case 'INACTIVE':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">
            Inactive
          </span>
        );
      case 'DECOMMISSIONED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
            Decommissioned
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center">
            <HardDrive className="h-6 w-6 mr-2.5 text-primary" />
            Installed Equipment & Assets
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage water purifiers, softeners, installation history, warranties and AMC contracts.
          </p>
        </div>
        {isManagerOrAdmin && (
          <button
            onClick={openCreateModal}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-10 py-2 px-4 shadow-sm"
          >
            <Plus className="mr-2 h-4 w-4" />
            Register New Asset
          </button>
        )}
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by serial #, model, customer name, phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 px-3 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="UNDER_MAINTENANCE">In Service</option>
            <option value="INACTIVE">Inactive</option>
            <option value="DECOMMISSIONED">Decommissioned</option>
          </select>

          <select
            value={warrantyFilter}
            onChange={(e) => {
              setWarrantyFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 px-3 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="ALL">All Warranties</option>
            <option value="ACTIVE">Under Active Warranty</option>
            <option value="EXPIRED">Expired Warranty</option>
          </select>
        </div>
      </div>

      {/* Asset Table */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin mb-3 text-primary" />
            <p className="text-sm">Loading installed assets...</p>
          </div>
        ) : assets.length === 0 ? (
          <div className="py-16 text-center">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <HardDrive className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground">No installed assets found</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              {searchTerm || statusFilter !== 'ALL' || warrantyFilter !== 'ALL'
                ? 'Try adjusting your search criteria or filters.'
                : 'Get started by registering a water purifier or softener installed at a customer site.'}
            </p>
            {isManagerOrAdmin && !searchTerm && (
              <button
                onClick={openCreateModal}
                className="mt-4 inline-flex items-center text-sm font-medium text-primary hover:underline"
              >
                + Register First Asset
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 border-b border-border text-xs uppercase font-medium text-muted-foreground">
                <tr>
                  <th className="px-6 py-3.5">Asset & Serial</th>
                  <th className="px-6 py-3.5">Customer</th>
                  <th className="px-6 py-3.5">Installation Date</th>
                  <th className="px-6 py-3.5">Warranty</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {assets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{asset.modelName}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 font-mono">
                        {asset.serialNumber ? `S/N: ${asset.serialNumber}` : 'No serial number'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{asset.customer?.user?.name || 'Unknown'}</div>
                      <div className="text-xs text-muted-foreground flex items-center mt-0.5">
                        <Phone className="w-3 h-3 mr-1 inline" />
                        {asset.customer?.user?.phone || 'No phone'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      <div className="flex items-center text-xs">
                        <Calendar className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                        {new Date(asset.installationDate).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 truncate max-w-xs" title={asset.installationAddress}>
                        <MapPin className="w-3 h-3 mr-1 inline" />
                        {asset.installationAddress}
                      </div>
                    </td>
                    <td className="px-6 py-4">{getWarrantyBadge(asset)}</td>
                    <td className="px-6 py-4">{getStatusBadge(asset.status)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center space-x-2">
                        <button
                          onClick={() => navigate(`/admin/installed-assets/${asset.id}`)}
                          className="inline-flex items-center px-2.5 py-1.5 rounded-md text-xs font-medium bg-muted hover:bg-muted/80 text-foreground transition-colors"
                          title="View Complete History"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1 text-primary" />
                          Details
                        </button>
                        {isManagerOrAdmin && (
                          <button
                            onClick={() => openEditModal(asset)}
                            className="inline-flex items-center p-1.5 rounded-md text-xs font-medium hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            title="Edit Asset"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalCount > 0 && (
          <div className="px-6 py-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <div>
              Showing {assets.length} of {totalCount} assets (Page {page} of {totalPages})
            </div>
            <div className="flex items-center space-x-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 border border-border rounded-md hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 border border-border rounded-md hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="bg-card rounded-xl shadow-xl border border-border w-full max-w-2xl z-10 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center px-6 py-4 border-b border-border">
              <h2 className="text-lg font-bold text-foreground flex items-center">
                <HardDrive className="w-5 h-5 mr-2 text-primary" />
                {editingAssetId ? 'Edit Installed Asset' : 'Register New Installed Asset'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 overflow-y-auto">
              {modalError && (
                <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md border border-destructive/20 flex items-start">
                  <AlertCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Customer */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Customer *
                  </label>
                  <select
                    required
                    value={formData.customerId}
                    onChange={(e) => handleCustomerChange(e.target.value)}
                    className="w-full h-10 px-3 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">-- Select Customer --</option>
                    {customers.map((c) => (
                      <option key={c.customerId} value={c.customerId}>
                        {c.user.name} ({c.user.phone})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Catalog Product Link */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Catalog Product (Optional)
                  </label>
                  <select
                    value={formData.productId}
                    onChange={(e) => handleProductChange(e.target.value)}
                    className="w-full h-10 px-3 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">-- Select from Inventory --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (₹{p.price})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Model Name */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Model / Appliance Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pratham RO + UV + TDS Water Purifier 10L"
                    value={formData.modelName}
                    onChange={(e) => setFormData({ ...formData, modelName: e.target.value })}
                    className="w-full h-10 px-3 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Serial Number */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Unique Serial Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. PE-RO-2026-0042"
                    value={formData.serialNumber}
                    onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                    className="w-full h-10 px-3 bg-background border border-input rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Status */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Asset Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full h-10 px-3 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="UNDER_MAINTENANCE">Under Maintenance</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="DECOMMISSIONED">Decommissioned</option>
                  </select>
                </div>

                {/* Installation Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Installation Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.installationDate}
                    onChange={(e) => setFormData({ ...formData, installationDate: e.target.value })}
                    className="w-full h-10 px-3 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Installed By Technician */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Installed By (Technician)
                  </label>
                  <select
                    value={formData.installedByTechId}
                    onChange={(e) => setFormData({ ...formData, installedByTechId: e.target.value })}
                    className="w-full h-10 px-3 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">-- Optional Technician --</option>
                    {technicians.map((t) => (
                      <option key={t.technicianId} value={t.technicianId}>
                        {t.user.name} ({t.technicianId})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Warranty Start Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Warranty Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.warrantyStartDate}
                    onChange={(e) => setFormData({ ...formData, warrantyStartDate: e.target.value })}
                    className="w-full h-10 px-3 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Warranty End Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Warranty End Date
                  </label>
                  <input
                    type="date"
                    value={formData.warrantyEndDate}
                    onChange={(e) => setFormData({ ...formData, warrantyEndDate: e.target.value })}
                    className="w-full h-10 px-3 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Installation Address */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Installation Address *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Full premise installation address"
                    value={formData.installationAddress}
                    onChange={(e) => setFormData({ ...formData, installationAddress: e.target.value })}
                    className="w-full h-10 px-3 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Installation Notes */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Installation Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Wall mounted, inlet pressure 2.5 bar, booster pump connected..."
                    value={formData.installationNotes}
                    onChange={(e) => setFormData({ ...formData, installationNotes: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-border flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-input rounded-md text-sm hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors flex items-center disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingAssetId ? 'Save Changes' : 'Register Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
