#!/usr/bin/env node

/**
 * Command-line test for Supabase user settings
 * Run with: node test-settings-cli.js
 */

import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const SUPABASE_URL = 'https://vkgkqcsjgiyadivuxosp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrZ2txY3NqZ2l5YWRpdnV4b3NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MDgyMTcsImV4cCI6MjA4NDQ4NDIxN30.8QhHn9A6WqXhBqP9qLzJ8d4X7zK2mY3n4w5z6x7y8z';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test user ID
const TEST_USER_ID = 'cli-test-user-' + Date.now();

console.log('🔧 Supabase Settings CLI Test');
console.log('===============================');
console.log(`Test User ID: ${TEST_USER_ID}`);
console.log('');

// Utility functions
function log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`[${timestamp}] ${prefix} ${message}`);
}

// Supabase functions
async function getUserPreferences(userId) {
    try {
        const { data, error } = await supabase
            .from('user_preferences')
            .select('*')
            .eq('user_id', userId)
            .single();
        
        if (error) {
            if (error.code === 'PGRST116') {
                return null; // No rows found
            }
            throw error;
        }
        return data;
    } catch (error) {
        log(`Error getting user preferences: ${error.message}`, 'error');
        throw error;
    }
}

async function updateUserPreferences(userId, prefs) {
    try {
        const { data, error } = await supabase
            .from('user_preferences')
            .upsert({
                user_id: userId,
                ...prefs,
                updated_at: new Date().toISOString()
            })
            .select()
            .single();
        
        if (error) throw error;
        return data;
    } catch (error) {
        log(`Error updating user preferences: ${error.message}`, 'error');
        throw error;
    }
}

async function getDeveloperSettings(userId) {
    try {
        const { data, error } = await supabase
            .from('developer_settings')
            .select('*')
            .eq('user_id', userId)
            .single();
        
        if (error) {
            if (error.code === 'PGRST116') {
                return null; // No rows found
            }
            throw error;
        }
        return data;
    } catch (error) {
        log(`Error getting developer settings: ${error.message}`, 'error');
        throw error;
    }
}

async function setDeveloperSettings(userId, settings) {
    try {
        const { data, error } = await supabase
            .from('developer_settings')
            .upsert({
                user_id: userId,
                settings: settings,
                updated_at: new Date().toISOString()
            })
            .select()
            .single();
        
        if (error) throw error;
        return data;
    } catch (error) {
        log(`Error setting developer settings: ${error.message}`, 'error');
        throw error;
    }
}

// Test functions
async function testUserPreferences() {
    log('Testing User Preferences...', 'info');
    
    try {
        // Test 1: Save user preferences
        const userPrefs = {
            locale: 'en-US',
            theme: 'Dark',
            accent_color: '#5865F2',
            animate_gifs: 'hover',
            animate_icons: 'always',
            volume: 75,
            notisound: 'default'
        };
        
        log('Saving user preferences...', 'info');
        const savedPrefs = await updateUserPreferences(TEST_USER_ID, userPrefs);
        log(`User preferences saved: ${savedPrefs.user_id}`, 'success');
        
        // Test 2: Load user preferences
        log('Loading user preferences...', 'info');
        const loadedPrefs = await getUserPreferences(TEST_USER_ID);
        
        if (loadedPrefs) {
            log(`User preferences loaded: ${loadedPrefs.locale}, ${loadedPrefs.theme}`, 'success');
            
            // Test 3: Verify data integrity
            const integrityCheck = 
                loadedPrefs.locale === userPrefs.locale &&
                loadedPrefs.theme === userPrefs.theme &&
                loadedPrefs.accent_color === userPrefs.accent_color;
            
            if (integrityCheck) {
                log('User preferences data integrity: PASSED', 'success');
            } else {
                log('User preferences data integrity: FAILED', 'error');
            }
        } else {
            log('Failed to load user preferences', 'error');
        }
        
    } catch (error) {
        log(`User preferences test failed: ${error.message}`, 'error');
    }
}

async function testDeveloperSettings() {
    log('Testing Developer Settings...', 'info');
    
    try {
        // Test 1: Save developer settings
        const devSettings = {
            gatewayLogging: true,
            gatewayCompression: true,
            showTraces: false,
            interceptApiTraces: true,
            cacheSourceMaps: false,
            logBannedFields: true,
            reportSystem: false
        };
        
        log('Saving developer settings...', 'info');
        const savedSettings = await setDeveloperSettings(TEST_USER_ID, devSettings);
        log(`Developer settings saved: ${savedSettings.user_id}`, 'success');
        
        // Test 2: Load developer settings
        log('Loading developer settings...', 'info');
        const loadedSettings = await getDeveloperSettings(TEST_USER_ID);
        
        if (loadedSettings && loadedSettings.settings) {
            const settings = loadedSettings.settings;
            log(`Developer settings loaded: gatewayLogging=${settings.gatewayLogging}, showTraces=${settings.showTraces}`, 'success');
            
            // Test 3: Verify data integrity
            const integrityCheck = 
                settings.gatewayLogging === devSettings.gatewayLogging &&
                settings.showTraces === devSettings.showTraces &&
                settings.cacheSourceMaps === devSettings.cacheSourceMaps;
            
            if (integrityCheck) {
                log('Developer settings data integrity: PASSED', 'success');
            } else {
                log('Developer settings data integrity: FAILED', 'error');
            }
        } else {
            log('Failed to load developer settings', 'error');
        }
        
    } catch (error) {
        log(`Developer settings test failed: ${error.message}`, 'error');
    }
}

async function testMultipleUsers() {
    log('Testing Multiple Users...', 'info');
    
    const testUsers = ['user-a', 'user-b', 'user-c'];
    
    for (const userId of testUsers) {
        try {
            // Save unique settings for each user
            await updateUserPreferences(userId, {
                locale: `locale-${userId}`,
                theme: userId === 'user-a' ? 'Dark' : userId === 'user-b' ? 'Light' : 'Gold',
                accent_color: `#${userId.slice(-6)}`
            });
            
            await setDeveloperSettings(userId, {
                gatewayLogging: userId === 'user-a',
                showTraces: userId === 'user-b',
                cacheSourceMaps: userId === 'user-c'
            });
            
            log(`Settings saved for ${userId}`, 'success');
        } catch (error) {
            log(`Failed to save settings for ${userId}: ${error.message}`, 'error');
        }
    }
    
    // Verify each user has different settings
    for (const userId of testUsers) {
        try {
            const prefs = await getUserPreferences(userId);
            const devSettings = await getDeveloperSettings(userId);
            
            if (prefs && devSettings) {
                log(`${userId}: ${prefs.theme}, gatewayLogging=${devSettings.settings.gatewayLogging}`, 'success');
            }
        } catch (error) {
            log(`Failed to load settings for ${userId}: ${error.message}`, 'error');
        }
    }
}

async function testErrorHandling() {
    log('Testing Error Handling...', 'info');
    
    try {
        // Test with invalid user ID
        const result = await getUserPreferences('invalid-user-id-format');
        if (result === null) {
            log('Invalid user ID correctly handled', 'success');
        } else {
            log('Invalid user ID not handled properly', 'error');
        }
        
        // Test non-existent user
        const nonExistent = await getUserPreferences('non-existent-user-' + Date.now());
        if (nonExistent === null) {
            log('Non-existent user correctly handled', 'success');
        } else {
            log('Non-existent user not handled properly', 'error');
        }
        
    } catch (error) {
        log(`Error handling test failed: ${error.message}`, 'error');
    }
}

async function cleanupTestData() {
    log('Cleaning up test data...', 'info');
    
    try {
        await supabase
            .from('user_preferences')
            .delete()
            .eq('user_id', TEST_USER_ID);
        
        await supabase
            .from('developer_settings')
            .delete()
            .eq('user_id', TEST_USER_ID);
        
        log('Test data cleaned up', 'success');
    } catch (error) {
        log(`Cleanup failed: ${error.message}`, 'error');
    }
}

// Main test runner
async function runTests() {
    log('Starting Supabase Settings Tests...', 'info');
    log('');
    
    try {
        await testUserPreferences();
        log('');
        
        await testDeveloperSettings();
        log('');
        
        await testMultipleUsers();
        log('');
        
        await testErrorHandling();
        log('');
        
        log('All tests completed!', 'success');
        
    } catch (error) {
        log(`Test suite failed: ${error.message}`, 'error');
    } finally {
        // Clean up test data
        await cleanupTestData();
        log('');
        log('Test suite finished', 'info');
    }
}

// Run the tests
runTests().catch(console.error);
