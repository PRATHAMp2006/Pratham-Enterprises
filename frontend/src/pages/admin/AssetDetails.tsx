import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import {
  HardDrive,
  ArrowLeft,
  Calendar,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Wrench,
  User,
  Phone,
  Mail,
  AlertCircle,
  Loader2,
  FileCheck,
} from 'lucide-react';

interface AssetDetailData {
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
  createdAt: string;
  customer: {
    customerId: string;
    address: string;
    user: {
      name: string;
      phone: string;
      email: string;
    };
  };
  product: {
    id: string;
    name: string;
    price: number;
    description?: string;
  } | null;
  installedBy: {
    technicianId: string;
    user: {
      name: string;
      phone: string;
    };
  } | null;
  computedWarranty: {
    status: string;
    daysRemaining: number | null;
  };
  amcContracts: Array<{
    id: string;
    contractNumber: string;
    startDate: string;
    endDate: string;
    contractAmount: number;
    includedVisits: number;
    completedVisits: number;
    status: string;
    renewalStatus: string;
    renewalNotes?: string | null;
  }>;
  serviceSchedules: Array<{
    id: string;
    dueDate: string;
    status: string;
    serviceType: string;
    notes?: string | null;
  }>;
  serviceRequests: Array<{
    id: string;
    description: string;
    status: string;
    createdAt: string;
    scheduledDate?: string | null;
    technician?: {
      user: {
        name: string;
      };
    } | null;
    serviceReport?: {
      id: string;
      notes?: string | null;
      partsReplaced?: string | null;
      partNumber?: string | null;
      nextServiceDate?: string | null;
      rating?: number | null;
      feedback?: string | null;
    } | null;
  }>;
}

export default function AssetDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [asset, setAsset] = useState<AssetDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'warranty' | 'amc' | 'history'>('overview');

  useEffect(() => {
    const fetchAssetDetail = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await api.get(`/installed-assets/${id}`);
        setAsset(response.data);
      } catch (err: any) {
        console.error('Failed to load asset detail:', err);
        setError(err.response?.data?.message || 'Failed to load asset details.');
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchAssetDetail();
    }
  }, [id]);

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin mb-3 text-primary" />
        <p className="text-sm">Loading asset details & history...</p>
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="py-16 text-center max-w-md mx-auto">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
        <h3 className="text-lg font-bold">Unable to load asset</h3>
        <p className="text-sm text-muted-foreground mt-1">{error || 'Asset not found.'}</p>
        <button
          onClick={() => navigate('/admin/installed-assets')}
          className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
        >
          Back to Installed Assets
        </button>
      </div>
    );
  }

  const getWarrantyBadge = () => {
    const status = asset.computedWarranty?.status;
    const days = asset.computedWarranty?.daysRemaining;

    if (status === 'ACTIVE') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <ShieldCheck className="w-3.5 h-3.5 mr-1" />
          Active Warranty ({days} days remaining)
        </span>
      );
    }
    if (status === 'EXPIRED') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
          <ShieldAlert className="w-3.5 h-3.5 mr-1" />
          Warranty Expired
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
        <Shield className="w-3.5 h-3.5 mr-1" />
        No Warranty Recorded
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Back button and title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/admin/installed-assets')}
            className="p-2 border border-border rounded-lg bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{asset.modelName}</h1>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                  asset.status === 'ACTIVE'
                    ? 'bg-green-100 text-green-800 border-green-200'
                    : asset.status === 'UNDER_MAINTENANCE'
                    ? 'bg-amber-100 text-amber-800 border-amber-200'
                    : 'bg-slate-100 text-slate-800 border-slate-200'
                }`}
              >
                {asset.status.replace('_', ' ')}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5 font-mono">
              Serial Number: {asset.serialNumber || 'Not assigned'}
            </p>
          </div>
        </div>
        <div>{getWarrantyBadge()}</div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex space-x-6 text-sm font-medium">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 border-b-2 transition-colors flex items-center ${
              activeTab === 'overview'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <HardDrive className="w-4 h-4 mr-2" />
            Overview & Installation
          </button>
          <button
            onClick={() => setActiveTab('warranty')}
            className={`py-3 border-b-2 transition-colors flex items-center ${
              activeTab === 'warranty'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Shield className="w-4 h-4 mr-2" />
            Warranty Status
          </button>
          <button
            onClick={() => setActiveTab('amc')}
            className={`py-3 border-b-2 transition-colors flex items-center ${
              activeTab === 'amc'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileCheck className="w-4 h-4 mr-2" />
            AMC Contracts ({asset.amcContracts?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-3 border-b-2 transition-colors flex items-center ${
              activeTab === 'history'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Wrench className="w-4 h-4 mr-2" />
            Service History ({asset.serviceRequests?.length || 0})
          </button>
        </nav>
      </div>

      {/* TAB CONTENT */}

      {/* 1. OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Customer Card */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-foreground flex items-center">
              <User className="w-4 h-4 mr-2 text-primary" />
              Customer Details
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-border/50 pb-2">
                <span className="text-muted-foreground">Customer Name</span>
                <span className="font-medium text-foreground">{asset.customer?.user?.name}</span>
              </div>
              <div className="flex justify-between border-b border-border/50 pb-2">
                <span className="text-muted-foreground">Customer ID</span>
                <span className="font-mono text-foreground">{asset.customer?.customerId}</span>
              </div>
              <div className="flex justify-between border-b border-border/50 pb-2">
                <span className="text-muted-foreground">Phone</span>
                <span className="font-medium text-foreground flex items-center">
                  <Phone className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
                  {asset.customer?.user?.phone}
                </span>
              </div>
              <div className="flex justify-between border-b border-border/50 pb-2">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium text-foreground flex items-center">
                  <Mail className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
                  {asset.customer?.user?.email}
                </span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-muted-foreground">Registered Address</span>
                <span className="font-medium text-foreground text-right max-w-xs">{asset.customer?.address}</span>
              </div>
            </div>
          </div>

          {/* Installation Details */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-foreground flex items-center">
              <Calendar className="w-4 h-4 mr-2 text-primary" />
              Installation Information
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-border/50 pb-2">
                <span className="text-muted-foreground">Installation Date</span>
                <span className="font-medium text-foreground">
                  {new Date(asset.installationDate).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between border-b border-border/50 pb-2">
                <span className="text-muted-foreground">Installed By Technician</span>
                <span className="font-medium text-foreground">
                  {asset.installedBy?.user?.name
                    ? `${asset.installedBy.user.name} (${asset.installedBy.technicianId})`
                    : 'Not specified'}
                </span>
              </div>
              <div className="flex justify-between border-b border-border/50 pb-2">
                <span className="text-muted-foreground">Catalog Product</span>
                <span className="font-medium text-foreground">{asset.product?.name || 'Custom Product'}</span>
              </div>
              <div className="flex justify-between border-b border-border/50 pb-2">
                <span className="text-muted-foreground">Installation Site</span>
                <span className="font-medium text-foreground text-right max-w-xs">{asset.installationAddress}</span>
              </div>
              <div className="pt-1">
                <span className="text-muted-foreground block text-xs uppercase tracking-wider mb-1">
                  Installation Notes
                </span>
                <p className="bg-muted/40 p-3 rounded-md text-foreground text-xs leading-relaxed">
                  {asset.installationNotes || 'No specific installation notes recorded.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. WARRANTY TAB */}
      {activeTab === 'warranty' && (
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div>
              <h3 className="text-lg font-bold text-foreground">Manufacturer & Service Warranty</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Standard guarantee on RO membrane, pump, filters and electrical components.
              </p>
            </div>
            <div>{getWarrantyBadge()}</div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-muted/30 border border-border rounded-lg text-center">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                Warranty Start Date
              </span>
              <span className="text-base font-bold text-foreground mt-1 block">
                {asset.warrantyStartDate ? new Date(asset.warrantyStartDate).toLocaleDateString() : 'N/A'}
              </span>
            </div>
            <div className="p-4 bg-muted/30 border border-border rounded-lg text-center">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                Warranty Expiry Date
              </span>
              <span className="text-base font-bold text-foreground mt-1 block">
                {asset.warrantyEndDate ? new Date(asset.warrantyEndDate).toLocaleDateString() : 'N/A'}
              </span>
            </div>
            <div className="p-4 bg-muted/30 border border-border rounded-lg text-center">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                Coverage Status
              </span>
              <span className="text-base font-bold mt-1 block text-primary">
                {asset.computedWarranty?.status === 'ACTIVE'
                  ? `${asset.computedWarranty.daysRemaining} Days Left`
                  : asset.computedWarranty?.status === 'EXPIRED'
                  ? 'Expired'
                  : 'No Active Policy'}
              </span>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 space-y-2">
            <h4 className="font-semibold text-slate-900 uppercase tracking-wider">Warranty Terms & Conditions</h4>
            <ul className="list-disc pl-4 space-y-1">
              <li>Covers repairs and replacement of defective RO booster pump, SV, adapter and membrane housing.</li>
              <li>Consumable items (sediment cartridge, carbon block) are covered under periodic maintenance schedule.</li>
              <li>Free labor provided for all warranty-authorized service calls.</li>
            </ul>
          </div>
        </div>
      )}

      {/* 3. AMC CONTRACTS TAB */}
      {activeTab === 'amc' && (
        <div className="space-y-4">
          {asset.amcContracts && asset.amcContracts.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {asset.amcContracts.map((contract) => (
                <div key={contract.id} className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-3">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pb-3 border-b border-border">
                    <div>
                      <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground block">
                        Contract Number
                      </span>
                      <h4 className="text-base font-bold text-foreground">{contract.contractNumber}</h4>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          contract.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-800 border-green-200'
                            : 'bg-slate-100 text-slate-800 border-slate-200'
                        }`}
                      >
                        {contract.status}
                      </span>
                      <span className="text-sm font-bold text-foreground">₹{contract.contractAmount}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-muted-foreground block">Start Date</span>
                      <span className="font-medium text-foreground">
                        {new Date(contract.startDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">End Date</span>
                      <span className="font-medium text-foreground">
                        {new Date(contract.endDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Included Visits</span>
                      <span className="font-medium text-foreground">{contract.includedVisits} Visits</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Completed Visits</span>
                      <span className="font-medium text-foreground">
                        {contract.completedVisits} / {contract.includedVisits}
                      </span>
                    </div>
                  </div>

                  {/* Visit progress bar */}
                  <div className="pt-2">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Service Progress</span>
                      <span>
                        {Math.round((contract.completedVisits / Math.max(1, contract.includedVisits)) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(
                            100,
                            (contract.completedVisits / Math.max(1, contract.includedVisits)) * 100
                          )}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl p-12 text-center">
              <FileCheck className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
              <h4 className="text-base font-semibold text-foreground">No AMC Contract Found</h4>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                This asset does not currently have an active Annual Maintenance Contract attached.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 4. SERVICE HISTORY TAB */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {asset.serviceRequests && asset.serviceRequests.length > 0 ? (
            <div className="space-y-4">
              {asset.serviceRequests.map((req) => (
                <div key={req.id} className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-3">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                    <div>
                      <span className="text-xs text-muted-foreground">
                        Requested on {new Date(req.createdAt).toLocaleDateString()}
                      </span>
                      <h4 className="text-base font-semibold text-foreground mt-0.5">{req.description}</h4>
                    </div>
                    <div>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          req.status === 'COMPLETED'
                            ? 'bg-green-100 text-green-800 border-green-200'
                            : req.status === 'IN_PROGRESS'
                            ? 'bg-blue-100 text-blue-800 border-blue-200'
                            : 'bg-slate-100 text-slate-800 border-slate-200'
                        }`}
                      >
                        {req.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  {req.technician?.user && (
                    <div className="text-xs text-muted-foreground flex items-center">
                      <User className="w-3.5 h-3.5 mr-1" />
                      Assigned Technician: {req.technician.user.name}
                    </div>
                  )}

                  {req.serviceReport && (
                    <div className="mt-3 p-4 bg-muted/40 border border-border rounded-lg text-xs space-y-2">
                      <h5 className="font-semibold text-foreground uppercase tracking-wider">Service Report Summary</h5>
                      {req.serviceReport.partsReplaced && (
                        <div>
                          <span className="text-muted-foreground">Parts Replaced: </span>
                          <span className="font-medium text-foreground">{req.serviceReport.partsReplaced}</span>
                          {req.serviceReport.partNumber && (
                            <span className="text-muted-foreground"> ({req.serviceReport.partNumber})</span>
                          )}
                        </div>
                      )}
                      {req.serviceReport.notes && (
                        <div>
                          <span className="text-muted-foreground">Technician Notes: </span>
                          <span className="text-foreground">{req.serviceReport.notes}</span>
                        </div>
                      )}
                      {req.serviceReport.nextServiceDate && (
                        <div>
                          <span className="text-muted-foreground">Next Recommended Service: </span>
                          <span className="font-medium text-foreground">
                            {new Date(req.serviceReport.nextServiceDate).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl p-12 text-center">
              <Wrench className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
              <h4 className="text-base font-semibold text-foreground">No Service History</h4>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                No breakdown or periodic maintenance requests have been recorded for this equipment yet.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
