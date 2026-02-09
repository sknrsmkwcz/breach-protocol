import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeftIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useCard, useCreateCard, useUpdateCard } from '@/hooks/useCards';
import { useToast } from '@/contexts/ToastContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import type { CardType, FactionId, CardStatus } from '@/types/api';

interface CardFormData {
  name: string;
  type: CardType;
  faction: FactionId;
  description: string;
  base_value: string;
  status: CardStatus;
}

const cardTypeInfo: Record<CardType, { label: string; valueLabel: string; valueHint: string }> = {
  exploit: { label: 'Exploit', valueLabel: 'Damage', valueHint: 'Base damage dealt (2-5 typical)' },
  payload: { label: 'Payload', valueLabel: 'Boost', valueHint: 'Not used - payload always boosts by 1' },
  zeroday: { label: 'Zero-Day', valueLabel: 'Damage', valueHint: 'Fixed at 4 damage, 2 self-damage' },
  siphon: { label: 'Siphon', valueLabel: 'Drain', valueHint: 'Drains 1 from firewall, heals 1' },
  firewall: { label: 'Firewall', valueLabel: 'Block', valueHint: 'Damage blocked (2-5 typical)' },
  patch: { label: 'Patch', valueLabel: 'Heal', valueHint: 'Heals 3 if HP ≤ 10, else draw 2' },
  purge: { label: 'Purge', valueLabel: 'N/A', valueHint: 'Damage = number of own firewalls destroyed' },
};

export default function CardEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;
  const { data: card, isLoading: cardLoading } = useCard(id);
  const create = useCreateCard();
  const update = useUpdateCard();
  const { showToast } = useToast();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const { register, handleSubmit, reset, watch, formState: { errors, isDirty } } = useForm<CardFormData>({
    defaultValues: { 
      name: '', 
      type: 'exploit', 
      faction: 'phantom', 
      description: '', 
      base_value: '', 
      status: 'testing' 
    }
  });

  const watchedType = watch('type');
  const typeInfo = cardTypeInfo[watchedType];

  useEffect(() => { 
    if (card) {
      reset({ 
        name: card.name,
        type: card.type,
        faction: card.faction,
        description: card.description || '',
        base_value: card.base_value?.toString() || '',
        status: card.status
      }); 
    }
  }, [card, reset]);

  useEffect(() => {
    setHasUnsavedChanges(isDirty);
  }, [isDirty]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const onSubmit = async (data: CardFormData) => {
    const payload = {
      name: data.name.trim(),
      type: data.type,
      faction: data.faction,
      description: data.description.trim() || null,
      base_value: data.base_value ? parseInt(data.base_value) : null,
      status: data.status,
    };

    try {
      if (isNew) {
        await create.mutateAsync(payload);
        showToast('Card created successfully', 'success');
      } else {
        await update.mutateAsync({ id: id!, data: payload });
        showToast('Card updated successfully', 'success');
      }
      setHasUnsavedChanges(false);
      navigate('/cards');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save card', 'error');
    }
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      if (window.confirm('You have unsaved changes. Are you sure you want to leave?')) {
        navigate('/cards');
      }
    } else {
      navigate('/cards');
    }
  };

  const isSaving = create.isPending || update.isPending;

  if (!isNew && cardLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isNew && !card && !cardLoading) {
    return (
      <div className="card bg-cyber-red/10 border-cyber-red/20">
        <h2 className="text-lg font-semibold text-white mb-2">Card not found</h2>
        <p className="text-gray-400 mb-4">The card you're looking for doesn't exist or was deleted.</p>
        <button onClick={() => navigate('/cards')} className="btn-primary">Back to Cards</button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={handleCancel} className="p-2 hover:bg-gray-800 rounded transition-colors">
          <ArrowLeftIcon className="w-5 h-5 text-gray-400" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">{isNew ? 'Create New Card' : 'Edit Card'}</h1>
          {!isNew && <p className="text-gray-400 text-sm">ID: {id}</p>}
        </div>
      </div>

      {hasUnsavedChanges && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-cyber-yellow/10 border border-cyber-yellow/30">
          <ExclamationTriangleIcon className="w-5 h-5 text-cyber-yellow" />
          <span className="text-sm text-cyber-yellow">You have unsaved changes</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="card space-y-6">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Card Name <span className="text-cyber-red">*</span>
          </label>
          <input 
            {...register('name', { required: 'Name is required', minLength: { value: 2, message: 'Name must be at least 2 characters' } })} 
            className={`input ${errors.name ? 'border-cyber-red' : ''}`}
            placeholder="Enter card name"
          />
          {errors.name && <p className="mt-1 text-sm text-cyber-red">{errors.name.message}</p>}
        </div>

        {/* Type & Faction */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Type <span className="text-cyber-red">*</span>
            </label>
            <select {...register('type')} className="input">
              {Object.entries(cardTypeInfo).map(([type, info]) => (
                <option key={type} value={type}>{info.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Faction <span className="text-cyber-red">*</span>
            </label>
            <select {...register('faction')} className="input">
              <option value="phantom">Phantom (Offensive)</option>
              <option value="sentinel">Sentinel (Defensive)</option>
              <option value="neutral">Neutral</option>
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
          <textarea 
            {...register('description')} 
            className="input" 
            rows={3} 
            placeholder="Describe what this card does..."
          />
        </div>

        {/* Base Value & Status */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {typeInfo.valueLabel}
            </label>
            <input 
              type="number" 
              {...register('base_value', { min: { value: 0, message: 'Must be 0 or greater' }, max: { value: 99, message: 'Must be 99 or less' } })} 
              className={`input ${errors.base_value ? 'border-cyber-red' : ''}`}
              placeholder="0"
            />
            <p className="mt-1 text-xs text-gray-500">{typeInfo.valueHint}</p>
            {errors.base_value && <p className="mt-1 text-sm text-cyber-red">{errors.base_value.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
            <select {...register('status')} className="input">
              <option value="testing">Testing (not in game)</option>
              <option value="active">Active (in game)</option>
              <option value="disabled">Disabled</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              {watch('status') === 'testing' && 'Card won\'t appear in games yet'}
              {watch('status') === 'active' && 'Card will appear in games'}
              {watch('status') === 'disabled' && 'Card is hidden from games'}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
          <button type="button" onClick={handleCancel} className="btn-secondary">
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={isSaving}
            className="btn-primary flex items-center gap-2"
          >
            {isSaving && <LoadingSpinner size="sm" />}
            {isSaving ? 'Saving...' : isNew ? 'Create Card' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
