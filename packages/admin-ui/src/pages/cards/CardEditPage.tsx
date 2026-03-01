import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeftIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useCard, useCreateCard, useUpdateCard } from '@/hooks/useCards';
import { useValidateEffects } from '@/hooks/useEffects';
import { useToast } from '@/contexts/ToastContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { EffectPipelineEditor } from '@/components/effects';
import type { Effect, CardTypeEnum } from '@/types/effects';
import type { ValidationResult, CardStatus, FactionId } from '@/types/api';

interface CardFormData {
  name: string;
  cardType: CardTypeEnum;
  faction: FactionId;
  description: string;
  base_value: number | null;
  status: CardStatus;
}

const cardTypeCategories: CardTypeEnum[] = ['attack', 'utility', 'defense'];
const factions: FactionId[] = ['phantom', 'sentinel', 'neutral'];
const statuses: CardStatus[] = ['active', 'testing', 'disabled'];

export default function CardEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const isNew = !id || id === 'new';

  const { data: existingCard, isLoading } = useCard(isNew ? undefined : id);
  const createCard = useCreateCard();
  const updateCard = useUpdateCard();
  const validateEffects = useValidateEffects();

  const [effects, setEffects] = useState<Effect[]>([]);
  const [validation, setValidation] = useState<ValidationResult | undefined>();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'effects'>('basic');

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<CardFormData>({
    defaultValues: {
      name: '',
      cardType: 'attack',
      faction: 'phantom',
      description: '',
      base_value: null,
      status: 'testing',
    }
  });

  // Load existing card data
  useEffect(() => {
    if (existingCard) {
      reset({
        name: existingCard.name,
        cardType: (existingCard.cardType || (existingCard as unknown as { card_type: string }).card_type || 'utility') as CardTypeEnum,
        faction: existingCard.faction,
        description: existingCard.description || '',
        base_value: existingCard.base_value,
        status: existingCard.status,
      });
      setEffects(existingCard.effects || []);
    }
  }, [existingCard, reset]);

  // Track unsaved changes
  useEffect(() => {
    const subscription = watch(() => setHasUnsavedChanges(true));
    return () => subscription.unsubscribe();
  }, [watch]);

  // Validate effects when they change
  useEffect(() => {
    if (effects.length > 0) {
      validateEffects.mutate(effects, {
        onSuccess: (result) => setValidation(result as ValidationResult),
        onError: () => setValidation(undefined),
      });
    } else {
      setValidation(undefined);
    }
  }, [effects]);

  // Handle effects change
  const handleEffectsChange = (newEffects: Effect[]) => {
    setEffects(newEffects);
    setHasUnsavedChanges(true);
  };

  // Warn on navigation with unsaved changes
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
    // Check for validation errors in effects
    if (validation && !validation.valid) {
      showToast('Please fix effect errors before saving', 'error');
      return;
    }

    try {
      // Preserve existing type for legacy cards; derive from name for new cards
      const type = (!isNew && existingCard?.type)
        ? existingCard.type
        : data.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

      const cardData = {
        ...data,
        type,
        base_value: data.base_value || null,
        effects,
      };

      if (isNew) {
        await createCard.mutateAsync(cardData);
        showToast('Card created successfully', 'success');
      } else {
        await updateCard.mutateAsync({ id, data: cardData });
        showToast('Card updated successfully', 'success');
      }
      setHasUnsavedChanges(false);
      navigate('/cards');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to save card', 'error');
    }
  };

  if (!isNew && isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link 
          to="/cards" 
          className="p-2 hover:bg-gray-800 rounded"
          onClick={(e) => {
            if (hasUnsavedChanges && !confirm('You have unsaved changes. Leave anyway?')) {
              e.preventDefault();
            }
          }}
        >
          <ArrowLeftIcon className="w-5 h-5 text-gray-400" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">
            {isNew ? 'Create New Card' : `Edit: ${existingCard?.name}`}
          </h1>
          {hasUnsavedChanges && (
            <p className="text-yellow-500 text-sm flex items-center gap-1">
              <ExclamationTriangleIcon className="w-4 h-4" />
              Unsaved changes
            </p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-700">
        <button
          type="button"
          onClick={() => setActiveTab('basic')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'basic' 
              ? 'text-cyber-purple border-b-2 border-cyber-purple' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Basic Info
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('effects')}
          className={`px-4 py-2 font-medium flex items-center gap-2 ${
            activeTab === 'effects' 
              ? 'text-cyber-purple border-b-2 border-cyber-purple' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Effects
          {effects.length > 0 && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-cyber-purple/20 text-cyber-purple">
              {effects.length}
            </span>
          )}
          {validation && !validation.valid && (
            <ExclamationTriangleIcon className="w-4 h-4 text-red-400" />
          )}
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Basic Info Tab */}
        {activeTab === 'basic' && (
          <div className="card space-y-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Card Name *
              </label>
              <input
                {...register('name', { required: 'Name is required', maxLength: 100 })}
                className="input w-full"
                placeholder="Enter card name..."
              />
              {errors.name && (
                <p className="text-red-400 text-sm mt-1">{errors.name.message}</p>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Card Category
              </label>
              <select {...register('cardType')} className="input w-full">
                {cardTypeCategories.map(t => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>

            {/* Faction and Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Faction
                </label>
                <select {...register('faction')} className="input w-full">
                  {factions.map(f => (
                    <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Status
                </label>
                <select {...register('status')} className="input w-full">
                  {statuses.map(s => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Base Value */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Base Value
              </label>
              <input
                type="number"
                {...register('base_value', { valueAsNumber: true })}
                className="input w-32"
                placeholder="None"
              />
              <p className="text-xs text-gray-500 mt-1">
                Optional numeric value (used for damage, block strength, etc.)
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <textarea
                {...register('description')}
                rows={3}
                className="input w-full"
                placeholder="Card description (optional)..."
              />
            </div>

            {/* Generated Text Preview */}
            {existingCard?.generatedText && (
              <div className="p-3 bg-gray-800/50 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">Auto-generated effect text:</div>
                <div className="text-gray-300">{existingCard.generatedText}</div>
              </div>
            )}
          </div>
        )}

        {/* Effects Tab */}
        {activeTab === 'effects' && (
          <div className="card">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-white">Effect Pipeline</h3>
              <p className="text-sm text-gray-400">
                Define what this card does when played. Effects resolve in order.
              </p>
            </div>
            
            <EffectPipelineEditor
              effects={effects}
              onChange={handleEffectsChange}
              validation={validation}
            />
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end gap-3 mt-6">
          <Link
            to="/cards"
            className="btn-secondary"
            onClick={(e) => {
              if (hasUnsavedChanges && !confirm('You have unsaved changes. Leave anyway?')) {
                e.preventDefault();
              }
            }}
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={createCard.isPending || updateCard.isPending || (validation && !validation.valid)}
            className="btn-primary"
          >
            {createCard.isPending || updateCard.isPending ? (
              <LoadingSpinner size="sm" />
            ) : isNew ? (
              'Create Card'
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
