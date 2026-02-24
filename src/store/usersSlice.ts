import { createSlice } from '@reduxjs/toolkit';

// Legacy slice for backward compatibility  
const usersSlice = createSlice({
  name: 'users',
  initialState: {
    users: [],
    loading: false,
    error: null,
  },
  reducers: {},
});

export default usersSlice.reducer;