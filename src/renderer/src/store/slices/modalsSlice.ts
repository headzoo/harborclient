import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { SavedRequest, TrustedInviteKey } from '#/shared/types';
import type { RootState } from '#/renderer/src/store/redux';

export type CollectionModalMode = 'create' | 'create-and-save';
export type CollectionModalTab = 'create' | 'import' | 'invite';

export interface CollectionModalState {
  mode: CollectionModalMode;
  tab: CollectionModalTab;
  name: string;
  inviteTokenInput: string;
}

export interface InviteModalState {
  collectionId: number;
  collectionName: string;
  recipientKid: string;
  token: string;
  tokenLoading: boolean;
  tokenError: string | null;
  trustedKeys: TrustedInviteKey[];
  trustedKeysLoading: boolean;
}

export interface AboutModalState {
  open: boolean;
  version: string;
}

export interface ModalsState {
  collectionModal: CollectionModalState | null;
  invite: InviteModalState | null;
  pendingLoadRequest: SavedRequest | null;
  quitPrompt: string[] | null;
  about: AboutModalState;
}

const initialState: ModalsState = {
  collectionModal: null,
  invite: null,
  pendingLoadRequest: null,
  quitPrompt: null,
  about: { open: false, version: '' }
};

const modalsSlice = createSlice({
  name: 'modals',
  initialState,
  reducers: {
    openCollectionModal(
      state,
      action: PayloadAction<{ mode: CollectionModalMode; tab?: CollectionModalTab }>
    ) {
      state.collectionModal = {
        mode: action.payload.mode,
        tab: action.payload.tab ?? 'create',
        name: '',
        inviteTokenInput: ''
      };
    },
    closeCollectionModal(state) {
      state.collectionModal = null;
    },
    setCollectionModalTab(state, action: PayloadAction<CollectionModalTab>) {
      if (state.collectionModal) {
        state.collectionModal.tab = action.payload;
      }
    },
    setCollectionModalName(state, action: PayloadAction<string>) {
      if (state.collectionModal) {
        state.collectionModal.name = action.payload;
      }
    },
    setCollectionModalInviteTokenInput(state, action: PayloadAction<string>) {
      if (state.collectionModal) {
        state.collectionModal.inviteTokenInput = action.payload;
      }
    },
    openInviteModal(
      state,
      action: PayloadAction<{ collectionId: number; collectionName: string }>
    ) {
      state.invite = {
        collectionId: action.payload.collectionId,
        collectionName: action.payload.collectionName,
        recipientKid: '',
        token: '',
        tokenLoading: false,
        tokenError: null,
        trustedKeys: [],
        trustedKeysLoading: true
      };
    },
    closeInviteModal(state) {
      state.invite = null;
    },
    setInviteRecipientKid(state, action: PayloadAction<string>) {
      if (state.invite) {
        state.invite.recipientKid = action.payload;
        state.invite.token = '';
        state.invite.tokenError = null;
      }
    },
    setInviteTrustedKeysLoading(state, action: PayloadAction<boolean>) {
      if (state.invite) {
        state.invite.trustedKeysLoading = action.payload;
      }
    },
    setInviteTrustedKeys(state, action: PayloadAction<TrustedInviteKey[]>) {
      if (state.invite) {
        state.invite.trustedKeys = action.payload;
      }
    },
    setInviteTokenLoading(state, action: PayloadAction<boolean>) {
      if (state.invite) {
        state.invite.tokenLoading = action.payload;
      }
    },
    setInviteToken(state, action: PayloadAction<string>) {
      if (state.invite) {
        state.invite.token = action.payload;
      }
    },
    setInviteTokenError(state, action: PayloadAction<string | null>) {
      if (state.invite) {
        state.invite.tokenError = action.payload;
      }
    },
    setPendingLoadRequest(state, action: PayloadAction<SavedRequest | null>) {
      state.pendingLoadRequest = action.payload;
    },
    setQuitPrompt(state, action: PayloadAction<string[] | null>) {
      state.quitPrompt = action.payload;
    },
    openAboutModal(state) {
      state.about = { open: true, version: '' };
    },
    closeAboutModal(state) {
      state.about = { open: false, version: '' };
    },
    setAboutVersion(state, action: PayloadAction<string>) {
      state.about.version = action.payload;
    }
  }
});

export const {
  openCollectionModal,
  closeCollectionModal,
  setCollectionModalTab,
  setCollectionModalName,
  setCollectionModalInviteTokenInput,
  openInviteModal,
  closeInviteModal,
  setInviteRecipientKid,
  setInviteTrustedKeysLoading,
  setInviteTrustedKeys,
  setInviteTokenLoading,
  setInviteToken,
  setInviteTokenError,
  setPendingLoadRequest,
  setQuitPrompt,
  openAboutModal,
  closeAboutModal,
  setAboutVersion
} = modalsSlice.actions;

export const selectCollectionModal = (state: RootState): CollectionModalState | null =>
  state.modals.collectionModal;
export const selectInviteModal = (state: RootState): InviteModalState | null => state.modals.invite;
export const selectPendingLoadRequest = (state: RootState): SavedRequest | null =>
  state.modals.pendingLoadRequest;
export const selectQuitPrompt = (state: RootState): string[] | null => state.modals.quitPrompt;
export const selectAboutModal = (state: RootState): AboutModalState => state.modals.about;

export default modalsSlice.reducer;
