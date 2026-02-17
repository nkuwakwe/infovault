# Supabase Settings Testing Guide

This guide shows you how to test user settings and developer settings storage and retrieval from Supabase.

## 🧪 Test Options

### Option 1: Interactive Browser Test (Recommended)

1. **Start the test server:**
   ```bash
   cd /home/cash/infovault
   python3 -m http.server 8000
   ```

2. **Open the test page:**
   ```
   http://localhost:8000/test-real-supabase-settings.html
   ```

3. **Test the settings:**
   - Click **"Test Supabase Connection"** first
   - Set your User ID (default: `test-user-123`)
   - **Save User Preferences** - saves theme, locale, accent color, etc.
   - **Load User Preferences** - loads saved preferences from Supabase
   - **Save Developer Settings** - saves debug/development settings
   - **Load Developer Settings** - loads saved dev settings from Supabase

4. **Run comprehensive tests:**
   - **Test Save & Load Cycle** - tests complete save/load workflow
   - **Test Multiple Users** - tests different user data isolation
   - **Test Data Integrity** - verifies data is stored correctly
   - **Test Error Handling** - tests error scenarios

5. **Batch operations:**
   - **Save All Settings** - saves both user and dev settings
   - **Load All Settings** - loads both user and dev settings
   - **Clear All Settings** - removes all test data
   - **Compare Local vs Remote** - compares form data with database

### Option 2: Command-Line Test

1. **Run the CLI test:**
   ```bash
   cd /home/cash/infovault
   node test-settings-cli.js
   ```

2. **Watch the output:**
   - Tests user preferences save/load
   - Tests developer settings save/load
   - Tests multiple user data isolation
   - Tests error handling
   - Automatically cleans up test data

## 🔍 What Gets Tested

### User Preferences
- **Theme**: Dark, Light, White, Gold
- **Locale**: Language settings (en, fr, etc.)
- **Accent Color**: Custom color picker
- **Animation Settings**: GIF and icon animations
- **Volume & Notifications**: Audio settings

### Developer Settings
- **Gateway Logging**: Enable/disable gateway logs
- **Gateway Compression**: Toggle compression
- **Show Traces**: Display trace information
- **Intercept API Traces**: Capture API calls
- **Cache Source Maps**: Store source maps locally
- **Log Banned Fields**: Log restricted data

## 📊 Expected Results

### ✅ Successful Test Output
```
[12:00:00] ℹ️ 🔌 Testing Supabase connection...
[12:00:01] ✅ Supabase connection test passed
[12:00:02] ℹ️ 💾 Saving user preferences for test-user-123...
[12:00:03] ✅ User preferences saved successfully
[12:00:04] ℹ️ 📥 Loading user preferences for test-user-123...
[12:00:05] ✅ User preferences loaded successfully
[12:00:06] ℹ️ 💾 Saving developer settings for test-user-123...
[12:00:07] ✅ Developer settings saved successfully
[12:00:08] ℹ️ 📥 Loading developer settings for test-user-123...
[12:00:09] ✅ Developer settings loaded successfully
```

### 🎯 Key Verification Points
1. **Data Persistence**: Settings survive page refresh
2. **User Isolation**: Different users have separate settings
3. **Data Integrity**: Saved data matches loaded data exactly
4. **Error Handling**: Graceful handling of invalid operations
5. **Real-time Updates**: Changes reflect immediately in database

## 🔧 Troubleshooting

### Connection Issues
- **Error**: "Connection failed"
- **Solution**: Check Supabase URL and API keys
- **Verify**: Network connectivity and Supabase project status

### Data Not Saving
- **Error**: "Failed to save preferences"
- **Solution**: Check RLS policies on Supabase tables
- **Verify**: User authentication state

### Data Not Loading
- **Error**: "No data found"
- **Solution**: Check if data was actually saved
- **Verify**: User ID matches between save and load

### Permission Errors
- **Error**: "Permission denied"
- **Solution**: Update RLS policies in Supabase
- **Verify**: Table permissions for anonymous users

## 🗄️ Database Schema Requirements

Ensure your Supabase has these tables:

```sql
-- User Preferences
CREATE TABLE user_preferences (
    user_id TEXT PRIMARY KEY,
    locale TEXT DEFAULT 'en',
    theme TEXT DEFAULT 'dark',
    accent_color TEXT,
    animate_gifs TEXT DEFAULT 'hover',
    animate_icons TEXT DEFAULT 'always',
    volume INTEGER DEFAULT 50,
    notisound TEXT DEFAULT 'default',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Developer Settings
CREATE TABLE developer_settings (
    user_id TEXT PRIMARY KEY,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🎯 Success Criteria

The test is successful when:
- ✅ Connection to Supabase works
- ✅ User preferences save and load correctly
- ✅ Developer settings save and load correctly
- ✅ Data integrity is maintained
- ✅ Multiple users have isolated data
- ✅ Error handling works properly
- ✅ Form controls update with loaded data

## 🚀 Next Steps

After successful testing:
1. **Integrate** with your main application
2. **Add authentication** for real user management
3. **Implement real-time sync** for settings changes
4. **Add validation** for settings values
5. **Create backup/restore** functionality

---

**Happy Testing! 🎉**
