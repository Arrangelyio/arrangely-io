import { createSlice } from '@reduxjs/toolkit';

// Legacy slice for backward compatibility
const songsSlice = createSlice({
  name: 'songs',
  initialState: {
    songs: [],
    loading: false,
    error: null,
  },
  reducers: {},
});

export default songsSlice.reducer;