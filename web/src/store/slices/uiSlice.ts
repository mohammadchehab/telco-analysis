import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { userPreferencesAPI } from '../../utils/api';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

interface UIState {
  notifications: Notification[];
  loading: boolean;
  darkMode: boolean;
  userPreferences: {
    dark_mode_preference: boolean;
    email?: string;
  } | null;
}

const initialState: UIState = {
  notifications: [],
  loading: false,
  darkMode: true, // Default to dark mode
  userPreferences: null,
};

// Async thunks
export const fetchUserPreferences = createAsyncThunk(
  'ui/fetchUserPreferences',
  async () => {
    const response = await userPreferencesAPI.getCurrentUser();
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch user preferences');
    }
    return response.data?.user;
  }
);

export const updateUserPreferences = createAsyncThunk(
  'ui/updateUserPreferences',
  async (preferences: { dark_mode_preference?: boolean; email?: string }) => {
    const response = await userPreferencesAPI.updatePreferences(preferences);
    if (!response.success) {
      throw new Error(response.error || 'Failed to update user preferences');
    }
    return response.data?.user;
  }
);

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    addNotification: (state, action: PayloadAction<Omit<Notification, 'id'>>) => {
      const id = Date.now().toString();
      state.notifications.push({ ...action.payload, id });
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(n => n.id !== action.payload);
    },
    clearNotifications: (state) => {
      state.notifications = [];
    },
    setDarkMode: (state, action: PayloadAction<boolean>) => {
      state.darkMode = action.payload;
    },
    toggleDarkMode: (state) => {
      state.darkMode = !state.darkMode;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserPreferences.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchUserPreferences.fulfilled, (state, action) => {
        state.loading = false;
        state.userPreferences = action.payload;
        // Set dark mode based on user preference
        if (action.payload?.dark_mode_preference !== undefined) {
          state.darkMode = action.payload.dark_mode_preference;
        }
      })
      .addCase(fetchUserPreferences.rejected, (state) => {
        state.loading = false;
      })
      .addCase(updateUserPreferences.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateUserPreferences.fulfilled, (state, action) => {
        state.loading = false;
        state.userPreferences = action.payload;
        // Update dark mode if preference was changed
        if (action.payload?.dark_mode_preference !== undefined) {
          state.darkMode = action.payload.dark_mode_preference;
        }
      })
      .addCase(updateUserPreferences.rejected, (state) => {
        state.loading = false;
      });
  },
});

export const {
  addNotification,
  removeNotification,
  clearNotifications,
  setDarkMode,
  toggleDarkMode,
  setLoading,
} = uiSlice.actions;

export default uiSlice.reducer; 