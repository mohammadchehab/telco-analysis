import { configureStore } from '@reduxjs/toolkit';
import capabilitiesReducer from './slices/capabilitiesSlice';
import workflowReducer from './slices/workflowSlice';
import uiReducer from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    capabilities: capabilitiesReducer,
    workflow: workflowReducer,
    ui: uiReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 