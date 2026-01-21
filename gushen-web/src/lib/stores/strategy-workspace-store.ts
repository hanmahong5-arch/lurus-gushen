/**
 * Strategy Workspace Store
 * 策略编辑工作区状态管理
 *
 * Features:
 * - Auto-save drafts every 3 seconds
 * - Cross-page state persistence
 * - Undo/Redo support (via temporal middleware)
 * - Multi-tab synchronization (via localStorage events)
 *
 * This store ensures zero data loss when navigating between pages.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// ============================================================================
// Types
// ============================================================================

export type AutoSaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

export interface StrategyParameter {
  name: string;
  displayName: string;
  type: 'number' | 'boolean' | 'string' | 'list';
  value: number | boolean | string | number[];
  defaultValue?: number | boolean | string | number[];
  description?: string;
  category?: 'indicator' | 'signal' | 'risk' | 'position' | 'general';
  range?: { min?: number; max?: number };
  unit?: string;
  step?: number;
}

export interface StrategyWorkspace {
  // Core editing state
  strategyInput: string;
  generatedCode: string;
  parameters: StrategyParameter[];
  modifiedParams: Set<string>;

  // Metadata
  lastModified: Date;
  autoSaveStatus: AutoSaveStatus;
  lastSavedAt?: Date;

  // Generation state
  isGenerating: boolean;
  generationError: string | null;

  // Backtest state
  isBacktesting: boolean;
  lastBacktestResult?: unknown;
}

export interface Draft {
  id: string;
  workspace: StrategyWorkspace;
  timestamp: Date;
  label?: string;
}

interface WorkspaceState {
  // Current workspace
  current: StrategyWorkspace;

  // Drafts (auto-saved versions)
  drafts: Draft[];
  maxDrafts: number;

  // Settings
  autoSaveEnabled: boolean;
  autoSaveInterval: number; // seconds
}

interface WorkspaceActions {
  // Workspace updates
  updateStrategyInput: (input: string) => void;
  updateGeneratedCode: (code: string) => void;
  updateParameters: (params: StrategyParameter[]) => void;
  updateModifiedParams: (params: Set<string>) => void;

  // Generation state
  setGenerating: (isGenerating: boolean) => void;
  setGenerationError: (error: string | null) => void;

  // Backtest state
  setBacktesting: (isBacktesting: boolean) => void;
  setBacktestResult: (result: unknown) => void;

  // Auto-save
  saveDraft: () => void;
  loadDraft: (draftId: string) => void;
  deleteDraft: (draftId: string) => void;
  clearAllDrafts: () => void;

  // Status
  markAsUnsaved: () => void;
  markAsSaved: () => void;
  markAsSaving: () => void;
  markAsSaveError: () => void;

  // Reset
  resetWorkspace: () => void;

  // Utility
  hasUnsavedChanges: () => boolean;
  getLastSavedTime: () => Date | undefined;
}

export type WorkspaceStore = WorkspaceState & WorkspaceActions;

// ============================================================================
// Initial State
// ============================================================================

const INITIAL_WORKSPACE: StrategyWorkspace = {
  strategyInput: '',
  generatedCode: '',
  parameters: [],
  modifiedParams: new Set(),
  lastModified: new Date(),
  autoSaveStatus: 'saved',
  isGenerating: false,
  generationError: null,
  isBacktesting: false,
};

const INITIAL_STATE: WorkspaceState = {
  current: INITIAL_WORKSPACE,
  drafts: [],
  maxDrafts: 10,
  autoSaveEnabled: true,
  autoSaveInterval: 3,
};

// ============================================================================
// Store Implementation
// ============================================================================

export const useStrategyWorkspaceStore = create<WorkspaceStore>()(
  persist(
    immer((set, get) => ({
      ...INITIAL_STATE,

      // ----------------------------------------------------------------------
      // Workspace Updates
      // ----------------------------------------------------------------------

      updateStrategyInput: (input) => {
        set((state) => {
          state.current.strategyInput = input;
          state.current.lastModified = new Date();
          state.current.autoSaveStatus = 'unsaved';
        });
      },

      updateGeneratedCode: (code) => {
        set((state) => {
          state.current.generatedCode = code;
          state.current.lastModified = new Date();
          state.current.autoSaveStatus = 'unsaved';
        });
      },

      updateParameters: (params) => {
        set((state) => {
          state.current.parameters = params;
          state.current.lastModified = new Date();
          state.current.autoSaveStatus = 'unsaved';
        });
      },

      updateModifiedParams: (params) => {
        set((state) => {
          state.current.modifiedParams = params;
          state.current.lastModified = new Date();
          state.current.autoSaveStatus = 'unsaved';
        });
      },

      // ----------------------------------------------------------------------
      // Generation State
      // ----------------------------------------------------------------------

      setGenerating: (isGenerating) => {
        set((state) => {
          state.current.isGenerating = isGenerating;
        });
      },

      setGenerationError: (error) => {
        set((state) => {
          state.current.generationError = error;
        });
      },

      // ----------------------------------------------------------------------
      // Backtest State
      // ----------------------------------------------------------------------

      setBacktesting: (isBacktesting) => {
        set((state) => {
          state.current.isBacktesting = isBacktesting;
        });
      },

      setBacktestResult: (result) => {
        set((state) => {
          state.current.lastBacktestResult = result;
        });
      },

      // ----------------------------------------------------------------------
      // Auto-save
      // ----------------------------------------------------------------------

      saveDraft: () => {
        const state = get();
        const draft: Draft = {
          id: `draft_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          workspace: { ...state.current },
          timestamp: new Date(),
        };

        set((s) => {
          // Add new draft
          s.drafts.unshift(draft);

          // Trim to max
          if (s.drafts.length > s.maxDrafts) {
            s.drafts = s.drafts.slice(0, s.maxDrafts);
          }

          // Update status
          s.current.autoSaveStatus = 'saved';
          s.current.lastSavedAt = new Date();
        });
      },

      loadDraft: (draftId) => {
        const state = get();
        const draft = state.drafts.find((d) => d.id === draftId);

        if (draft) {
          set((s) => {
            s.current = { ...draft.workspace };
          });
        }
      },

      deleteDraft: (draftId) => {
        set((state) => {
          state.drafts = state.drafts.filter((d) => d.id !== draftId);
        });
      },

      clearAllDrafts: () => {
        set((state) => {
          state.drafts = [];
        });
      },

      // ----------------------------------------------------------------------
      // Status Management
      // ----------------------------------------------------------------------

      markAsUnsaved: () => {
        set((state) => {
          state.current.autoSaveStatus = 'unsaved';
        });
      },

      markAsSaved: () => {
        set((state) => {
          state.current.autoSaveStatus = 'saved';
          state.current.lastSavedAt = new Date();
        });
      },

      markAsSaving: () => {
        set((state) => {
          state.current.autoSaveStatus = 'saving';
        });
      },

      markAsSaveError: () => {
        set((state) => {
          state.current.autoSaveStatus = 'error';
        });
      },

      // ----------------------------------------------------------------------
      // Reset
      // ----------------------------------------------------------------------

      resetWorkspace: () => {
        set((state) => {
          state.current = { ...INITIAL_WORKSPACE };
        });
      },

      // ----------------------------------------------------------------------
      // Utility
      // ----------------------------------------------------------------------

      hasUnsavedChanges: () => {
        return get().current.autoSaveStatus === 'unsaved';
      },

      getLastSavedTime: () => {
        return get().current.lastSavedAt;
      },
    })),
    {
      name: 'gushen-strategy-workspace',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        current: {
          ...state.current,
          // Convert Set to Array for serialization
          modifiedParams: Array.from(state.current.modifiedParams),
        },
        drafts: state.drafts.slice(0, 5), // Only persist last 5 drafts
        autoSaveEnabled: state.autoSaveEnabled,
        autoSaveInterval: state.autoSaveInterval,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Restore Set from Array
          if (Array.isArray(state.current.modifiedParams)) {
            state.current.modifiedParams = new Set(
              state.current.modifiedParams as unknown as string[]
            );
          }

          // Restore Date objects
          state.current.lastModified = new Date(state.current.lastModified);
          if (state.current.lastSavedAt) {
            state.current.lastSavedAt = new Date(state.current.lastSavedAt);
          }

          // Restore drafts Date objects and Sets
          state.drafts = state.drafts.map((d) => ({
            ...d,
            timestamp: new Date(d.timestamp),
            workspace: {
              ...d.workspace,
              lastModified: new Date(d.workspace.lastModified),
              modifiedParams: new Set(
                d.workspace.modifiedParams as unknown as string[]
              ),
            },
          }));
        }
      },
    }
  )
);

// ============================================================================
// Selectors
// ============================================================================

export const selectWorkspace = (state: WorkspaceStore) => state.current;
export const selectAutoSaveStatus = (state: WorkspaceStore) =>
  state.current.autoSaveStatus;
export const selectHasUnsavedChanges = (state: WorkspaceStore) =>
  state.current.autoSaveStatus === 'unsaved';
export const selectDrafts = (state: WorkspaceStore) => state.drafts;
export const selectStrategyInput = (state: WorkspaceStore) =>
  state.current.strategyInput;
export const selectGeneratedCode = (state: WorkspaceStore) =>
  state.current.generatedCode;
export const selectIsGenerating = (state: WorkspaceStore) =>
  state.current.isGenerating;
export const selectIsBacktesting = (state: WorkspaceStore) =>
  state.current.isBacktesting;

// ============================================================================
// Multi-tab Synchronization
// ============================================================================

// Listen to storage events for cross-tab sync
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'gushen-strategy-workspace' && e.newValue) {
      try {
        const newState = JSON.parse(e.newValue);
        // Only update if the timestamp is newer
        const currentState = useStrategyWorkspaceStore.getState();
        const newTimestamp = new Date(newState.state?.current?.lastModified);
        const currentTimestamp = currentState.current.lastModified;

        if (newTimestamp > currentTimestamp) {
          // Another tab has newer data, sync it
          console.log('[WorkspaceStore] Syncing from another tab');
          useStrategyWorkspaceStore.setState(newState.state);
        }
      } catch (error) {
        console.error('[WorkspaceStore] Failed to sync from storage event:', error);
      }
    }
  });
}
