import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import libraryReducer from './slices/librarySlice';
import userSongsReducer from './slices/userSongsSlice';
import subscriptionReducer from './slices/subscriptionSlice';
import songsReducer from './songsSlice';
import usersReducer from './usersSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    library: libraryReducer,
    userSongs: userSongsReducer,
    subscription: subscriptionReducer,
    songs: songsReducer,
    users: usersReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;