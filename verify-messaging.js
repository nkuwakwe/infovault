#!/usr/bin/env node

/**
 * Simple verification script for Supabase messaging system
 * Run with: node verify-messaging.js
 */

import { createClient } from '@supabase/supabase-js';

// Configuration - update these with your actual values
const SUPABASE_URL = 'https://vkgkqcsjgiyadivuxosp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ErhOA0SIFaLJKXAIovqu8A_CSaXxW7q';

// Test configuration
const TEST_CHANNEL_ID = 'test-channel-123';
const TEST_GUILD_ID = 'test-guild-123';
const TEST_USER_ID = 'test-user-123';

class SimpleVerifier {
    constructor() {
        this.client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        this.testResults = [];
    }

    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
        console.log(`[${timestamp}] ${prefix} ${message}`);
    }

    logTest(name, success, message, data = null) {
        this.testResults.push({ name, success, message });
        this.log(`${success ? 'PASS' : 'FAIL'} ${name}: ${message}`, success ? 'success' : 'error');
        if (data && !success) {
            console.error('Error details:', data);
        }
    }

    async testConnection() {
        try {
            // Simple connection test
            const { data, error } = await this.client
                .from('messages')
                .select('count')
                .limit(1);

            if (error) {
                this.logTest('Database Connection', false, 'Failed to connect to messages table', error);
                return false;
            }

            this.logTest('Database Connection', true, 'Successfully connected to Supabase');
            return true;
        } catch (error) {
            this.logTest('Database Connection', false, 'Exception during connection test', error);
            return false;
        }
    }

    async testTableExists(tableName) {
        try {
            const { data, error } = await this.client
                .from(tableName)
                .select('*')
                .limit(1);

            if (error) {
                this.logTest(`Table ${tableName}`, false, `Table does not exist or no access`, error);
                return false;
            }

            this.logTest(`Table ${tableName}`, true, `Table exists and is accessible`);
            return true;
        } catch (error) {
            this.logTest(`Table ${tableName}`, false, `Exception checking table`, error);
            return false;
        }
    }

    async testCreateMessage() {
        const messageData = {
            message_id: `test-msg-${Date.now()}`,
            channel_id: TEST_CHANNEL_ID,
            guild_id: TEST_GUILD_ID,
            author_id: TEST_USER_ID,
            content: 'Test message from verification script',
            timestamp: new Date().toISOString()
        };

        try {
            const { data, error } = await this.client
                .from('messages')
                .insert(messageData)
                .select()
                .single();

            if (error) {
                this.logTest('Create Message', false, 'Failed to create message', error);
                return null;
            }

            this.logTest('Create Message', true, 'Message created successfully', data);
            return data;
        } catch (error) {
            this.logTest('Create Message', false, 'Exception creating message', error);
            return null;
        }
    }

    async testGetMessage(messageId) {
        if (!messageId) {
            this.logTest('Get Message', false, 'No message ID to test with');
            return false;
        }

        try {
            const { data, error } = await this.client
                .from('messages')
                .select('*')
                .eq('message_id', messageId)
                .single();

            if (error) {
                this.logTest('Get Message', false, 'Failed to retrieve message', error);
                return false;
            }

            this.logTest('Get Message', true, 'Message retrieved successfully', data);
            return true;
        } catch (error) {
            this.logTest('Get Message', false, 'Exception retrieving message', error);
            return false;
        }
    }

    async testUpdateMessage(messageId) {
        if (!messageId) {
            this.logTest('Update Message', false, 'No message ID to test with');
            return false;
        }

        try {
            const { data, error } = await this.client
                .from('messages')
                .update({
                    content: 'Updated test message',
                    edited_timestamp: new Date().toISOString()
                })
                .eq('message_id', messageId)
                .select()
                .single();

            if (error) {
                this.logTest('Update Message', false, 'Failed to update message', error);
                return false;
            }

            this.logTest('Update Message', true, 'Message updated successfully', data);
            return true;
        } catch (error) {
            this.logTest('Update Message', false, 'Exception updating message', error);
            return false;
        }
    }

    async testDeleteMessage(messageId) {
        if (!messageId) {
            this.logTest('Delete Message', false, 'No message ID to test with');
            return false;
        }

        try {
            const { error } = await this.client
                .from('messages')
                .delete()
                .eq('message_id', messageId);

            if (error) {
                this.logTest('Delete Message', false, 'Failed to delete message', error);
                return false;
            }

            this.logTest('Delete Message', true, 'Message deleted successfully');
            return true;
        } catch (error) {
            this.logTest('Delete Message', false, 'Exception deleting message', error);
            return false;
        }
    }

    async runVerification() {
        console.log('🔍 Starting Supabase Messaging System Verification\n');
        console.log('Configuration:');
        console.log(`- Supabase URL: ${SUPABASE_URL}`);
        console.log(`- Test Channel ID: ${TEST_CHANNEL_ID}`);
        console.log(`- Test Guild ID: ${TEST_GUILD_ID}`);
        console.log(`- Test User ID: ${TEST_USER_ID}\n`);

        // Test basic connection
        const connected = await this.testConnection();
        if (!connected) {
            console.log('\n❌ Verification failed: Cannot connect to Supabase');
            console.log('💡 Please check your Supabase configuration and network connectivity');
            return;
        }

        // Test required tables
        const requiredTables = [
            'messages',
            'message_attachments',
            'message_embeds',
            'message_reactions',
            'typing_indicators'
        ];

        console.log('\n📋 Checking required tables...');
        let tablesOk = true;
        for (const table of requiredTables) {
            const exists = await this.testTableExists(table);
            if (!exists) {
                tablesOk = false;
            }
        }

        if (!tablesOk) {
            console.log('\n❌ Some required tables are missing or inaccessible');
            console.log('💡 Please ensure your Supabase schema includes all required tables');
            return;
        }

        // Test CRUD operations
        console.log('\n🧪 Testing CRUD operations...');
        
        const createdMessage = await this.testCreateMessage();
        const messageId = createdMessage?.message_id;

        await this.testGetMessage(messageId);
        await this.testUpdateMessage(messageId);
        await this.testDeleteMessage(messageId);

        // Print results
        this.printResults();
    }

    printResults() {
        console.log('\n📊 Verification Results:');
        console.log('==========================');

        const passed = this.testResults.filter(r => r.success).length;
        const failed = this.testResults.filter(r => !r.success).length;
        const total = this.testResults.length;

        console.log(`Total Tests: ${total}`);
        console.log(`Passed: ${passed} ✅`);
        console.log(`Failed: ${failed} ❌`);
        console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%\n`);

        if (failed === 0) {
            console.log('🎉 All tests passed! Phase 1 implementation is working correctly.');
            console.log('✅ Ready to proceed with Phase 2: Message Class Migration');
        } else {
            console.log('⚠️  Some tests failed. Please address these issues before proceeding:');
            this.testResults
                .filter(r => !r.success)
                .forEach(r => console.log(`   - ${r.name}: ${r.message}`));
        }

        console.log('\n📝 Next Steps:');
        console.log('1. If all tests passed, you can proceed with Phase 2');
        console.log('2. If tests failed, check:');
        console.log('   - Supabase schema matches the expected structure');
        console.log('   - RLS policies allow test operations');
        console.log('   - Network connectivity to Supabase');
        console.log('   - API keys and permissions');
    }
}

// Run verification
if (import.meta.url === `file://${process.argv[1]}`) {
    const verifier = new SimpleVerifier();
    verifier.runVerification().catch(console.error);
}

export { SimpleVerifier };
