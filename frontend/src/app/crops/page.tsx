"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { apiRequest } from '@/lib/api';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import {
  Sprout,
  Plus,
  Trash2,
  Edit3,
  MapPin,
  CheckCircle2,
  AlertCircle,
  X,
  Filter,
  Loader2,
  Layers,
  Calendar,
  Sparkles
} from 'lucide-react';

interface Crop {
  id: string;
  crop_code: string;
  farmer_id: string;
  farm_location?: string;
  crop_name: string;
  variety?: string;
  acreage: number;
  quantity: number;
  quantity_unit: string;
  sowing_date: string;
  expected_harvest_date: string;
  actual_harvest_date?: string;
  status: 'Growing' | 'Ready to Harvest' | 'Stored' | 'Partially Sold' | 'Completed';
  notes?: string;
  aliases: Record<string, string>;
  created_at: string;
  updated_at: string;
}

const FALLBACK_SAMPLE_CROPS: Crop[] = [
  {
    id: 'crop-demo-001',
    crop_code: 'CROP-7R9K-2M4P',
    farmer_id: '00000000-0000-0000-0000-000000000001',
    farm_location: 'Lasalgaon, Nashik, Maharashtra',
    crop_name: 'Onion',
    variety: 'Nashik Red (गरवा कांदा)',
    acreage: 2.5,
    quantity: 85.0,
    quantity_unit: 'Quintal',
    sowing_date: '2026-06-15',
    expected_harvest_date: '2026-10-20',
    status: 'Growing',
    notes: 'Drip irrigated; good bulb formation.',
    aliases: { en: 'Onion', hi: 'प्याज', mr: 'कांदा' },
    created_at: '2026-06-15T10:00:00Z',
    updated_at: '2026-06-15T10:00:00Z',
  },
  {
    id: 'crop-demo-002',
    crop_code: 'CROP-3X5L-9W1Q',
    farmer_id: '00000000-0000-0000-0000-000000000001',
    farm_location: 'Lasalgaon, Nashik, Maharashtra',
    crop_name: 'Soybean',
    variety: 'JS 335 (पिवळा सोयाबीन)',
    acreage: 2.0,
    quantity: 30.0,
    quantity_unit: 'Quintal',
    sowing_date: '2026-06-20',
    expected_harvest_date: '2026-10-05',
    actual_harvest_date: '2026-10-05',
    status: 'Ready to Harvest',
    notes: 'Matured pods ready for thrashing and mandi evaluation.',
    aliases: { en: 'Soybean', hi: 'सोयाबीन', mr: 'सोयाबीन' },
    created_at: '2026-06-20T11:00:00Z',
    updated_at: '2026-10-05T09:30:00Z',
  }
];

export default function CropsPage() {
  const { profile } = useAuth();
  const { language, t } = useLanguage();

  const [crops, setCrops] = useState<Crop[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCrop, setEditingCrop] = useState<Crop | null>(null);
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form states
  const [cropName, setCropName] = useState('Onion');
  const [variety, setVariety] = useState('Nashik Red (गरवा कांदा)');
  const [farmLocation, setFarmLocation] = useState('Lasalgaon, Nashik, Maharashtra');
  const [acreage, setAcreage] = useState(2.5);
  const [quantity, setQuantity] = useState(85.0);
  const [quantityUnit, setQuantityUnit] = useState('Quintal');
  const [sowingDate, setSowingDate] = useState('2026-06-15');
  const [expectedHarvestDate, setExpectedHarvestDate] = useState('2026-10-20');
  const [cropStatus, setCropStatus] = useState<'Growing' | 'Ready to Harvest' | 'Stored' | 'Partially Sold' | 'Completed'>('Growing');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchCrops = async () => {
    try {
      const endpoint = selectedStatus === 'ALL' ? '/crops' : `/crops?status=${encodeURIComponent(selectedStatus)}`;
      const list = await apiRequest<Crop[]>(endpoint);
      setCrops(list);
    } catch {
      setCrops(FALLBACK_SAMPLE_CROPS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const endpoint = selectedStatus === 'ALL' ? '/crops' : `/crops?status=${encodeURIComponent(selectedStatus)}`;
        const list = await apiRequest<Crop[]>(endpoint);
        if (!ignore) {
          setCrops(list);
        }
      } catch {
        if (!ignore) {
          setCrops(FALLBACK_SAMPLE_CROPS);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      ignore = true;
    };
  }, [selectedStatus, profile]);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleOpenAddModal = () => {
    setEditingCrop(null);
    setCropName('Onion');
    setVariety('Nashik Red');
    setFarmLocation(profile?.village ? `${profile.village}, ${profile.district}` : 'Lasalgaon, Nashik');
    setAcreage(2.0);
    setQuantity(60.0);
    setQuantityUnit('Quintal');
    setSowingDate('2026-06-15');
    setExpectedHarvestDate('2026-10-25');
    setCropStatus('Growing');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (crop: Crop) => {
    setEditingCrop(crop);
    setCropName(crop.crop_name);
    setVariety(crop.variety || '');
    setFarmLocation(crop.farm_location || '');
    setAcreage(crop.acreage);
    setQuantity(crop.quantity);
    setQuantityUnit(crop.quantity_unit);
    setSowingDate(crop.sowing_date);
    setExpectedHarvestDate(crop.expected_harvest_date);
    setCropStatus(crop.status);
    setNotes(crop.notes || '');
    setIsModalOpen(true);
  };

  const handleSaveCrop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (new Date(expectedHarvestDate) < new Date(sowingDate)) {
      showNotification('error', 'Expected harvest date cannot be earlier than sowing date.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingCrop) {
        // Update crop
        await apiRequest(`/crops/${editingCrop.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            crop_name: cropName,
            variety,
            farm_location: farmLocation,
            acreage,
            quantity,
            quantity_unit: quantityUnit,
            sowing_date: sowingDate,
            expected_harvest_date: expectedHarvestDate,
            status: cropStatus,
            notes,
          }),
        });
        showNotification('success', `Crop '${cropName}' updated successfully.`);
      } else {
        // Create new crop
        await apiRequest('/crops', {
          method: 'POST',
          body: JSON.stringify({
            crop_name: cropName,
            variety,
            farm_location: farmLocation,
            acreage,
            quantity,
            quantity_unit: quantityUnit,
            sowing_date: sowingDate,
            expected_harvest_date: expectedHarvestDate,
            status: cropStatus,
            notes,
          }),
        });
        showNotification('success', `Crop '${cropName}' created successfully.`);
      }
      setIsModalOpen(false);
      await fetchCrops();
    } catch (err: unknown) {
      showNotification('error', err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickStatusChange = async (cropId: string, newStatus: string) => {
    try {
      await apiRequest(`/crops/${cropId}/status?new_status=${encodeURIComponent(newStatus)}`, {
        method: 'PATCH',
      });
      showNotification('success', `Status updated to ${newStatus}`);
      await fetchCrops();
    } catch (err: unknown) {
      showNotification('error', err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const handleDeleteCrop = async (cropId: string) => {
    try {
      await apiRequest(`/crops/${cropId}?confirmed=true`, {
        method: 'DELETE',
      });
      showNotification('success', 'Crop record deleted permanently.');
      setDeleteConfirmationId(null);
      await fetchCrops();
    } catch (err: unknown) {
      showNotification('error', err instanceof Error ? err.message : 'Failed to delete crop');
    }
  };

  const getStatusBadgeClass = (st: string) => {
    switch (st) {
      case 'Growing':
        return 'bg-[#1F7A4D]/15 text-[#1F7A4D] dark:text-[#66A65C] border-[#1F7A4D]/30';
      case 'Ready to Harvest':
        return 'bg-[#D97706]/15 text-[#D97706] border-[#D97706]/30';
      case 'Stored':
        return 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30';
      case 'Partially Sold':
        return 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30';
      case 'Completed':
        return 'bg-stone-500/15 text-stone-600 dark:text-stone-300 border-stone-500/30';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const statuses = ['ALL', 'Growing', 'Ready to Harvest', 'Stored', 'Partially Sold', 'Completed'];

  return (
    <ProtectedRoute>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 relative overflow-hidden">
        {/* Subtle Luxury Ambient Glow */}
        <div className="absolute top-10 left-1/4 w-96 h-96 bg-[#0D824D]/10 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute top-96 right-10 w-96 h-96 bg-[#C5A45D]/10 rounded-full blur-3xl pointer-events-none -z-10" />

        {/* Header */}
        <div className="border-b border-[#E3E8DF] dark:border-[#1E382B] pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#123B2A]/10 dark:bg-[#C5A45D]/15 text-[#123B2A] dark:text-[#E8D8B0] border border-[#C5A45D]/40 shadow-xs mb-2">
              <Sprout className="w-3.5 h-3.5 text-[#C5A45D]" />
              <span className="font-medium tracking-wide">Plot Inventory • Cultivation Ledger</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-[#123B2A] dark:text-[#F2F5F3] tracking-tight">
                {t('myCrops')}
              </h1>
              <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-[#C5A45D]/15 text-[#8C6F2D] dark:text-[#D4B66F] border border-[#C5A45D]/30 shadow-xs">
                {crops.length} Active Records
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#6B756E] dark:text-[#96A69D] mt-1.5 font-light leading-relaxed">
              Track cultivation lifecycle from sowing to storage and market realization across plots.
            </p>
          </div>

          <button
            onClick={handleOpenAddModal}
            className="px-5 py-3 rounded-2xl bg-[#0D281D] hover:bg-[#153e2e] text-white font-bold text-xs shadow-md shadow-[#0D281D]/20 transition-all flex items-center justify-center gap-2 shrink-0 border border-[#C5A45D]/40 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#C5A45D]" />
            <span>{t('addCrop')}</span>
          </button>
        </div>

        {/* Notifications Banner */}
        {notification && (
          <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between shadow-xs ${
            notification.type === 'success'
              ? 'bg-[#1F7A4D]/10 text-[#1F7A4D] dark:text-[#66A65C] border-[#1F7A4D]/30'
              : 'bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]/30'
          }`}>
            <div className="flex items-center space-x-2">
              {notification.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              <span>{notification.message}</span>
            </div>
            <button onClick={() => setNotification(null)} className="cursor-pointer">
              <X className="w-4 h-4 text-[#6B756E]" />
            </button>
          </div>
        )}

        {/* Status Filter Bar */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
          <Filter className="w-4 h-4 text-[#6B756E] shrink-0 ml-1" />
          {statuses.map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 border cursor-pointer ${
                selectedStatus === st
                  ? 'bg-[#0D281D] text-white border-[#C5A45D]/50 shadow-sm ring-1 ring-[#C5A45D]/30'
                  : 'bg-white dark:bg-[#14271E] border-[#E3E8DF] dark:border-[#1E382B] text-[#6B756E] dark:text-[#96A69D] hover:border-[#0D824D]/50 hover:bg-[#FAF9F5]'
              }`}
            >
              {st === 'ALL' ? 'All Crops' : st}
            </button>
          ))}
        </div>

        {/* Crops Cards Grid */}
        {loading ? (
          <div className="p-12 text-center rounded-3xl card-luxury space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FAF9F5] dark:bg-[#13241C] text-[#0D824D] mx-auto flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
            <p className="text-xs text-[#6B756E] dark:text-[#96A69D]">Loading crop records...</p>
          </div>
        ) : crops.length === 0 ? (
          <div className="p-12 text-center rounded-3xl card-luxury space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FAF9F5] dark:bg-[#13241C] text-[#6B756E] mx-auto flex items-center justify-center">
              <Sprout className="w-6 h-6 text-[#C5A45D]" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#123B2A] dark:text-[#F2F5F3]">No Crops Found</h3>
              <p className="text-xs text-[#6B756E] dark:text-[#96A69D]">
                {selectedStatus === 'ALL'
                  ? "You haven't added any crop records yet. Click 'Add Crop' to register your active produce."
                  : `No crops currently in '${selectedStatus}' status.`}
              </p>
            </div>
            <button
              onClick={handleOpenAddModal}
              className="px-5 py-2.5 rounded-xl bg-[#0D281D] hover:bg-[#153e2e] text-white font-bold text-xs border border-[#C5A45D]/40 shadow-sm cursor-pointer"
            >
              Add Your First Crop
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {crops.map((crop) => {
              const aliasName = crop.aliases[language] || crop.crop_name;
              return (
                <div
                  key={crop.id}
                  className="p-6 rounded-3xl card-luxury transition-all duration-300 hover:shadow-xl hover:border-[#0D824D]/40 flex flex-col justify-between space-y-5"
                >
                  
                  {/* Card Header */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] font-bold text-[#0D281D] dark:text-[#C5A45D] bg-[#FAF9F5] dark:bg-[#13241C] px-3 py-1 rounded-lg border border-[#E3E8DF] dark:border-[#1E382B]">
                        {crop.crop_code}
                      </span>
                      <span className={`px-3 py-0.5 rounded-full text-[11px] font-bold border shadow-xs ${getStatusBadgeClass(crop.status)}`}>
                        {crop.status}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-xl font-extrabold text-[#123B2A] dark:text-[#F2F5F3]">
                        {crop.crop_name}
                        {aliasName !== crop.crop_name && (
                          <span className="text-sm font-semibold text-[#0D824D] dark:text-[#66A65C] ml-1.5">
                            ({aliasName})
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-[#6B756E] dark:text-[#96A69D] mt-0.5">
                        Variety: <span className="font-semibold text-[#202B24] dark:text-[#D1DCD5]">{crop.variety || 'Standard Local'}</span>
                      </p>
                    </div>
                  </div>

                  {/* Card Details */}
                  <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-[#FAF9F5] dark:bg-[#13241C] text-xs border border-[#E3E8DF] dark:border-[#1E382B]">
                    <div>
                      <span className="text-[#6B756E] dark:text-[#96A69D] block text-[10px] uppercase font-bold">Cultivation</span>
                      <span className="font-bold text-[#123B2A] dark:text-[#F2F5F3]">{crop.acreage} {t('acres')}</span>
                    </div>
                    <div>
                      <span className="text-[#6B756E] dark:text-[#96A69D] block text-[10px] uppercase font-bold">Yield Quantity</span>
                      <span className="font-bold text-[#0D824D] dark:text-[#66A65C]">{crop.quantity} {crop.quantity_unit}</span>
                    </div>
                    <div>
                      <span className="text-[#6B756E] dark:text-[#96A69D] block text-[10px] uppercase font-bold">Sowing Date</span>
                      <span className="font-semibold text-[#202B24] dark:text-[#D1DCD5]">{crop.sowing_date}</span>
                    </div>
                    <div>
                      <span className="text-[#6B756E] dark:text-[#96A69D] block text-[10px] uppercase font-bold">Harvest Date</span>
                      <span className="font-semibold text-[#202B24] dark:text-[#D1DCD5]">
                        {crop.actual_harvest_date || crop.expected_harvest_date}
                      </span>
                    </div>
                  </div>

                  {crop.farm_location && (
                    <div className="flex items-center space-x-1.5 text-xs text-[#6B756E] dark:text-[#96A69D]">
                      <MapPin className="w-3.5 h-3.5 text-[#0D824D]" />
                      <span>{crop.farm_location}</span>
                    </div>
                  )}

                  {crop.notes && (
                    <p className="text-[11px] text-[#6B756E] dark:text-[#96A69D] italic line-clamp-2">
                      &quot;{crop.notes}&quot;
                    </p>
                  )}

                  {/* Status Switcher & Actions */}
                  <div className="pt-3 border-t border-[#E3E8DF] dark:border-[#1E382B] flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <select
                        value={crop.status}
                        onChange={(e) => handleQuickStatusChange(crop.id, e.target.value)}
                        className="text-xs font-bold py-1.5 px-3 rounded-xl bg-[#FAF9F5] dark:bg-[#13241C] border border-[#E3E8DF] dark:border-[#1E382B] text-[#202B24] dark:text-[#F2F5F3] focus:ring-2 focus:ring-[#0D824D] cursor-pointer"
                      >
                        <option value="Growing">Growing</option>
                        <option value="Ready to Harvest">Ready to Harvest</option>
                        <option value="Stored">Stored</option>
                        <option value="Partially Sold">Partially Sold</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleOpenEditModal(crop)}
                        className="p-2 rounded-xl text-[#6B756E] hover:text-[#0D281D] hover:bg-[#FAF9F5] dark:hover:bg-[#13241C] transition-colors cursor-pointer"
                        title="Edit Crop"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmationId(crop.id)}
                        className="p-2 rounded-xl text-[#6B756E] hover:text-[#DC2626] hover:bg-[#DC2626]/10 transition-colors cursor-pointer"
                        title="Delete Crop"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Delete Confirmation In Card */}
                  {deleteConfirmationId === crop.id && (
                    <div className="p-3.5 rounded-2xl bg-[#DC2626]/10 border border-[#DC2626]/30 space-y-2">
                      <div className="text-xs font-bold text-[#DC2626]">
                        Delete this crop record permanently?
                      </div>
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => setDeleteConfirmationId(null)}
                          className="px-3 py-1 text-xs font-semibold rounded-xl bg-white dark:bg-[#14271E] text-[#202B24] dark:text-[#F2F5F3] border border-[#E3E8DF] dark:border-[#1E382B] cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleDeleteCrop(crop.id)}
                          className="px-3 py-1 text-xs font-bold rounded-xl bg-[#DC2626] text-white hover:bg-red-700 cursor-pointer shadow-xs"
                        >
                          Confirm Delete
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}

        {/* Add / Edit Crop Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="max-w-xl w-full bg-white dark:bg-[#14271E] p-6 sm:p-8 rounded-3xl border border-[#C5A45D]/40 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
              
              <div className="flex items-center justify-between border-b border-[#E3E8DF] dark:border-[#1E382B] pb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0D824D]/10 text-[#0D824D] flex items-center justify-center border border-[#0D824D]/20">
                    <Sprout className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-extrabold text-[#123B2A] dark:text-[#F2F5F3]">
                    {editingCrop ? 'Edit Crop Record' : 'Register New Crop Plot'}
                  </h2>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-xl text-[#6B756E] hover:text-[#123B2A] dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveCrop} className="space-y-4">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#202B24] dark:text-[#F2F5F3] mb-1.5">
                      Crop Name (पीक)
                    </label>
                    <select
                      value={cropName}
                      onChange={(e) => setCropName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-2xl border border-[#E3E8DF] dark:border-[#1E382B] bg-[#FAF9F5] dark:bg-[#13241C] text-[#202B24] dark:text-[#F2F5F3] text-sm focus:ring-2 focus:ring-[#0D824D] cursor-pointer"
                    >
                      <option value="Onion">Onion (कांदा / प्याज)</option>
                      <option value="Soybean">Soybean (सोयाबीन)</option>
                      <option value="Cotton">Cotton (कापूस / कपास)</option>
                      <option value="Wheat">Wheat (गहू / गेहूं)</option>
                      <option value="Tomato">Tomato (टोमॅटो / टमाटर)</option>
                      <option value="Potato">Potato (बटाटा / आलू)</option>
                      <option value="Gram">Bengal Gram (हरभरा / चना)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#202B24] dark:text-[#F2F5F3] mb-1.5">
                      Variety (वाण)
                    </label>
                    <input
                      type="text"
                      value={variety}
                      onChange={(e) => setVariety(e.target.value)}
                      placeholder="e.g. Nashik Red / Garva"
                      className="w-full px-4 py-2.5 rounded-2xl border border-[#E3E8DF] dark:border-[#1E382B] bg-[#FAF9F5] dark:bg-[#13241C] text-[#202B24] dark:text-[#F2F5F3] text-sm focus:ring-2 focus:ring-[#0D824D]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#202B24] dark:text-[#F2F5F3] mb-1.5">
                      Cultivated Acreage ({t('acres')})
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      required
                      value={acreage}
                      onChange={(e) => setAcreage(parseFloat(e.target.value) || 0)}
                      className="w-full px-4 py-2.5 rounded-2xl border border-[#E3E8DF] dark:border-[#1E382B] bg-[#FAF9F5] dark:bg-[#13241C] text-[#202B24] dark:text-[#F2F5F3] text-sm focus:ring-2 focus:ring-[#0D824D]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#202B24] dark:text-[#F2F5F3] mb-1.5">
                      Yield Quantity
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      required
                      value={quantity}
                      onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                      className="w-full px-4 py-2.5 rounded-2xl border border-[#E3E8DF] dark:border-[#1E382B] bg-[#FAF9F5] dark:bg-[#13241C] text-[#202B24] dark:text-[#F2F5F3] text-sm focus:ring-2 focus:ring-[#0D824D]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#202B24] dark:text-[#F2F5F3] mb-1.5">
                      Unit
                    </label>
                    <select
                      value={quantityUnit}
                      onChange={(e) => setQuantityUnit(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-2xl border border-[#E3E8DF] dark:border-[#1E382B] bg-[#FAF9F5] dark:bg-[#13241C] text-[#202B24] dark:text-[#F2F5F3] text-sm focus:ring-2 focus:ring-[#0D824D] cursor-pointer"
                    >
                      <option value="Quintal">Quintal (क्विंटल)</option>
                      <option value="Kg">Kilogram (किलो)</option>
                      <option value="Tonne">Tonne (टन)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#202B24] dark:text-[#F2F5F3] mb-1.5">
                      Sowing Date (पेरणी / लागवड)
                    </label>
                    <input
                      type="date"
                      required
                      value={sowingDate}
                      onChange={(e) => setSowingDate(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-2xl border border-[#E3E8DF] dark:border-[#1E382B] bg-[#FAF9F5] dark:bg-[#13241C] text-[#202B24] dark:text-[#F2F5F3] text-sm focus:ring-2 focus:ring-[#0D824D]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#202B24] dark:text-[#F2F5F3] mb-1.5">
                      Expected Harvest Date (अपेक्षित काढणी)
                    </label>
                    <input
                      type="date"
                      required
                      value={expectedHarvestDate}
                      onChange={(e) => setExpectedHarvestDate(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-2xl border border-[#E3E8DF] dark:border-[#1E382B] bg-[#FAF9F5] dark:bg-[#13241C] text-[#202B24] dark:text-[#F2F5F3] text-sm focus:ring-2 focus:ring-[#0D824D]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#202B24] dark:text-[#F2F5F3] mb-1.5">
                      Lifecycle Status
                    </label>
                    <select
                      value={cropStatus}
                      onChange={(e) => setCropStatus(e.target.value as 'Growing' | 'Ready to Harvest' | 'Stored' | 'Partially Sold' | 'Completed')}
                      className="w-full px-4 py-2.5 rounded-2xl border border-[#E3E8DF] dark:border-[#1E382B] bg-[#FAF9F5] dark:bg-[#13241C] text-[#202B24] dark:text-[#F2F5F3] text-sm focus:ring-2 focus:ring-[#0D824D] cursor-pointer"
                    >
                      <option value="Growing">Growing (वाढ होत आहे)</option>
                      <option value="Ready to Harvest">Ready to Harvest (काढणीस तयार)</option>
                      <option value="Stored">Stored (साठवणूक केलेले)</option>
                      <option value="Partially Sold">Partially Sold (अंशतः विकलेले)</option>
                      <option value="Completed">Completed (पूर्ण विकलेले)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#202B24] dark:text-[#F2F5F3] mb-1.5">
                      Farm Location
                    </label>
                    <input
                      type="text"
                      value={farmLocation}
                      onChange={(e) => setFarmLocation(e.target.value)}
                      placeholder="e.g. Lasalgaon, Nashik"
                      className="w-full px-4 py-2.5 rounded-2xl border border-[#E3E8DF] dark:border-[#1E382B] bg-[#FAF9F5] dark:bg-[#13241C] text-[#202B24] dark:text-[#F2F5F3] text-sm focus:ring-2 focus:ring-[#0D824D]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#202B24] dark:text-[#F2F5F3] mb-1.5">
                    Optional Notes
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Seed brand, organic fertilizer applied, drip irrigation line."
                    className="w-full px-4 py-2.5 rounded-2xl border border-[#E3E8DF] dark:border-[#1E382B] bg-[#FAF9F5] dark:bg-[#13241C] text-[#202B24] dark:text-[#F2F5F3] text-sm focus:ring-2 focus:ring-[#0D824D]"
                  />
                </div>

                <div className="pt-4 flex justify-end space-x-3 border-t border-[#E3E8DF] dark:border-[#1E382B]">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl border border-[#E3E8DF] dark:border-[#1E382B] text-[#6B756E] dark:text-[#96A69D] font-semibold text-xs hover:bg-[#FAF9F5] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 rounded-xl bg-[#0D281D] hover:bg-[#153e2e] text-white font-bold text-xs shadow-md border border-[#C5A45D]/40 cursor-pointer hover:scale-[1.02]"
                  >
                    {submitting ? 'Saving...' : editingCrop ? 'Update Crop Record' : 'Save New Crop Plot'}
                  </button>
                </div>

              </form>

            </div>
          </div>
        )}

      </div>
    </ProtectedRoute>
  );
}
