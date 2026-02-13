// Test suite for Supabase messaging system
import {
	createMessage,
	getMessages,
	getMessageByDiscordId,
	updateMessage,
	deleteMessage,
	pinMessage,
	createMessageAttachment,
	getMessageAttachments,
	createMessageEmbed,
	getMessageEmbeds,
	addReaction,
	removeReaction,
	getMessageReactions,
	setTypingStatus,
	getTypingUsers,
	MessageData,
	AttachmentData,
	EmbedData
} from '../supabaseData.js';

interface TestResult {
	success: boolean;
	message: string;
	data?: any;
	error?: any;
}

class MessagingTester {
	private testResults: TestResult[] = [];
	private testChannelId = 'test-channel-123';
	private testGuildId = 'test-guild-123';
	private testUserId = 'test-user-123';
	private createdMessageId: string | null = null;

	// Helper method to log test results
	private logTest(name: string, result: TestResult) {
		console.log(`[${result.success ? 'PASS' : 'FAIL'}] ${name}: ${result.message}`);
		if (result.error) {
			console.error('Error details:', result.error);
		}
		this.testResults.push({ ...result, message: name });
	}

	// Test basic message creation
	async testCreateMessage(): Promise<void> {
		const messageData: MessageData = {
			id: 'test-message-' + Date.now(),
			channel_id: this.testChannelId,
			guild_id: this.testGuildId,
			author_id: this.testUserId,
			content: 'Hello from Supabase test!',
			type: 0
		};

		try {
			const result = await createMessage(messageData);
			if (result) {
				this.createdMessageId = result.message_id || messageData.id;
				this.logTest('Create Message', {
					success: true,
					message: 'Message created successfully',
					data: result
				});
			} else {
				this.logTest('Create Message', {
					success: false,
					message: 'Failed to create message'
				});
			}
		} catch (error) {
			this.logTest('Create Message', {
				success: false,
				message: 'Exception during message creation',
				error
			});
		}
	}

	// Test message retrieval
	async testGetMessages(): Promise<void> {
		try {
			const messages = await getMessages(this.testChannelId, 10);
			this.logTest('Get Messages', {
				success: Array.isArray(messages),
				message: `Retrieved ${messages.length} messages`,
				data: messages
			});
		} catch (error) {
			this.logTest('Get Messages', {
				success: false,
				message: 'Exception during message retrieval',
				error
			});
		}
	}

	// Test message retrieval by Discord ID
	async testGetMessageByDiscordId(): Promise<void> {
		if (!this.createdMessageId) {
			this.logTest('Get Message by Discord ID', {
				success: false,
				message: 'No message ID to test with'
			});
			return;
		}

		try {
			const message = await getMessageByDiscordId(this.createdMessageId);
			this.logTest('Get Message by Discord ID', {
				success: !!message,
				message: message ? 'Message found by Discord ID' : 'Message not found',
				data: message
			});
		} catch (error) {
			this.logTest('Get Message by Discord ID', {
				success: false,
				message: 'Exception during message retrieval by Discord ID',
				error
			});
		}
	}

	// Test message update
	async testUpdateMessage(): Promise<void> {
		if (!this.createdMessageId) {
			this.logTest('Update Message', {
				success: false,
				message: 'No message ID to test with'
			});
			return;
		}

		try {
			const updatedMessage = await updateMessage(this.createdMessageId, {
				content: 'Updated message content'
			});
			this.logTest('Update Message', {
				success: !!updatedMessage,
				message: updatedMessage ? 'Message updated successfully' : 'Failed to update message',
				data: updatedMessage
			});
		} catch (error) {
			this.logTest('Update Message', {
				success: false,
				message: 'Exception during message update',
				error
			});
		}
	}

	// Test message pinning
	async testPinMessage(): Promise<void> {
		if (!this.createdMessageId) {
			this.logTest('Pin Message', {
				success: false,
				message: 'No message ID to test with'
			});
			return;
		}

		try {
			const pinResult = await pinMessage(this.createdMessageId, true);
			this.logTest('Pin Message', {
				success: pinResult,
				message: pinResult ? 'Message pinned successfully' : 'Failed to pin message'
			});

			// Test unpinning
			const unpinResult = await pinMessage(this.createdMessageId, false);
			this.logTest('Unpin Message', {
				success: unpinResult,
				message: unpinResult ? 'Message unpinned successfully' : 'Failed to unpin message'
			});
		} catch (error) {
			this.logTest('Pin Message', {
				success: false,
				message: 'Exception during message pinning',
				error
			});
		}
	}

	// Test attachment creation
	async testCreateAttachment(): Promise<void> {
		if (!this.createdMessageId) {
			this.logTest('Create Attachment', {
				success: false,
				message: 'No message ID to test with'
			});
			return;
		}

		const attachmentData: AttachmentData = {
			message_id: this.createdMessageId,
			filename: 'test-image.png',
			content_type: 'image/png',
			size: 1024,
			url: 'https://example.com/test-image.png',
			width: 100,
			height: 100
		};

		try {
			const attachment = await createMessageAttachment(attachmentData);
			this.logTest('Create Attachment', {
				success: !!attachment,
				message: attachment ? 'Attachment created successfully' : 'Failed to create attachment',
				data: attachment
			});
		} catch (error) {
			this.logTest('Create Attachment', {
				success: false,
				message: 'Exception during attachment creation',
				error
			});
		}
	}

	// Test attachment retrieval
	async testGetAttachments(): Promise<void> {
		if (!this.createdMessageId) {
			this.logTest('Get Attachments', {
				success: false,
				message: 'No message ID to test with'
			});
			return;
		}

		try {
			const attachments = await getMessageAttachments(this.createdMessageId);
			this.logTest('Get Attachments', {
				success: Array.isArray(attachments),
				message: `Retrieved ${attachments.length} attachments`,
				data: attachments
			});
		} catch (error) {
			this.logTest('Get Attachments', {
				success: false,
				message: 'Exception during attachment retrieval',
				error
			});
		}
	}

	// Test embed creation
	async testCreateEmbed(): Promise<void> {
		if (!this.createdMessageId) {
			this.logTest('Create Embed', {
				success: false,
				message: 'No message ID to test with'
			});
			return;
		}

		const embedData: EmbedData = {
			message_id: this.createdMessageId,
			title: 'Test Embed',
			description: 'This is a test embed from Supabase',
			color: 0x5865F2,
			url: 'https://example.com'
		};

		try {
			const embed = await createMessageEmbed(embedData);
			this.logTest('Create Embed', {
				success: !!embed,
				message: embed ? 'Embed created successfully' : 'Failed to create embed',
				data: embed
			});
		} catch (error) {
			this.logTest('Create Embed', {
				success: false,
				message: 'Exception during embed creation',
				error
			});
		}
	}

	// Test embed retrieval
	async testGetEmbeds(): Promise<void> {
		if (!this.createdMessageId) {
			this.logTest('Get Embeds', {
				success: false,
				message: 'No message ID to test with'
			});
			return;
		}

		try {
			const embeds = await getMessageEmbeds(this.createdMessageId);
			this.logTest('Get Embeds', {
				success: Array.isArray(embeds),
				message: `Retrieved ${embeds.length} embeds`,
				data: embeds
			});
		} catch (error) {
			this.logTest('Get Embeds', {
				success: false,
				message: 'Exception during embed retrieval',
				error
			});
		}
	}

	// Test reaction addition
	async testAddReaction(): Promise<void> {
		if (!this.createdMessageId) {
			this.logTest('Add Reaction', {
				success: false,
				message: 'No message ID to test with'
			});
			return;
		}

		try {
			const addResult = await addReaction(this.createdMessageId, '👍', this.testUserId);
			this.logTest('Add Reaction', {
				success: addResult,
				message: addResult ? 'Reaction added successfully' : 'Failed to add reaction'
			});
		} catch (error) {
			this.logTest('Add Reaction', {
				success: false,
				message: 'Exception during reaction addition',
				error
			});
		}
	}

	// Test reaction retrieval
	async testGetReactions(): Promise<void> {
		if (!this.createdMessageId) {
			this.logTest('Get Reactions', {
				success: false,
				message: 'No message ID to test with'
			});
			return;
		}

		try {
			const reactions = await getMessageReactions(this.createdMessageId);
			this.logTest('Get Reactions', {
				success: Array.isArray(reactions),
				message: `Retrieved ${reactions.length} reactions`,
				data: reactions
			});
		} catch (error) {
			this.logTest('Get Reactions', {
				success: false,
				message: 'Exception during reaction retrieval',
				error
			});
		}
	}

	// Test reaction removal
	async testRemoveReaction(): Promise<void> {
		if (!this.createdMessageId) {
			this.logTest('Remove Reaction', {
				success: false,
				message: 'No message ID to test with'
			});
			return;
		}

		try {
			const removeResult = await removeReaction(this.createdMessageId, '👍', this.testUserId);
			this.logTest('Remove Reaction', {
				success: removeResult,
				message: removeResult ? 'Reaction removed successfully' : 'Failed to remove reaction'
			});
		} catch (error) {
			this.logTest('Remove Reaction', {
				success: false,
				message: 'Exception during reaction removal',
				error
			});
		}
	}

	// Test typing status
	async testTypingStatus(): Promise<void> {
		try {
			// Set typing status
			const setResult = await setTypingStatus(this.testChannelId, this.testUserId, true);
			this.logTest('Set Typing Status', {
				success: setResult,
				message: setResult ? 'Typing status set successfully' : 'Failed to set typing status'
			});

			// Get typing users
			const typingUsers = await getTypingUsers(this.testChannelId);
			this.logTest('Get Typing Users', {
				success: Array.isArray(typingUsers),
				message: `Retrieved ${typingUsers.length} typing users`,
				data: typingUsers
			});

			// Clear typing status
			const clearResult = await setTypingStatus(this.testChannelId, this.testUserId, false);
			this.logTest('Clear Typing Status', {
				success: clearResult,
				message: clearResult ? 'Typing status cleared successfully' : 'Failed to clear typing status'
			});
		} catch (error) {
			this.logTest('Typing Status', {
				success: false,
				message: 'Exception during typing status operations',
				error
			});
		}
	}

	// Test message deletion (cleanup)
	async testDeleteMessage(): Promise<void> {
		if (!this.createdMessageId) {
			this.logTest('Delete Message', {
				success: false,
				message: 'No message ID to test with'
			});
			return;
		}

		try {
			const deleteResult = await deleteMessage(this.createdMessageId);
			this.logTest('Delete Message', {
				success: deleteResult,
				message: deleteResult ? 'Message deleted successfully' : 'Failed to delete message'
			});
		} catch (error) {
			this.logTest('Delete Message', {
				success: false,
				message: 'Exception during message deletion',
				error
			});
		}
	}

	// Run all tests
	async runAllTests(): Promise<void> {
		console.log('🧪 Starting Supabase Messaging System Tests...\n');

		await this.testCreateMessage();
		await this.testGetMessages();
		await this.testGetMessageByDiscordId();
		await this.testUpdateMessage();
		await this.testPinMessage();
		await this.testCreateAttachment();
		await this.testGetAttachments();
		await this.testCreateEmbed();
		await this.testGetEmbeds();
		await this.testAddReaction();
		await this.testGetReactions();
		await this.testRemoveReaction();
		await this.testTypingStatus();
		await this.testDeleteMessage();

		this.printResults();
	}

	// Print test results summary
	private printResults(): void {
		console.log('\n📊 Test Results Summary:');
		console.log('========================');

		const passed = this.testResults.filter(r => r.success).length;
		const failed = this.testResults.filter(r => !r.success).length;
		const total = this.testResults.length;

		console.log(`Total Tests: ${total}`);
		console.log(`Passed: ${passed} ✅`);
		console.log(`Failed: ${failed} ❌`);
		console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

		if (failed > 0) {
			console.log('\n❌ Failed Tests:');
			this.testResults
				.filter(r => !r.success)
				.forEach(r => console.log(`- ${r.message}: ${r.data?.message || 'Unknown error'}`));
		}

		console.log('\n🎯 Recommendations:');
		if (failed === 0) {
			console.log('✅ All tests passed! The messaging system is ready for integration.');
		} else {
			console.log('⚠️  Some tests failed. Check the error messages above and fix issues before proceeding.');
			console.log('💡 Common issues:');
			console.log('   - Supabase connection problems');
			console.log('   - Missing database tables');
			console.log('   - Permission/RLS policy issues');
			console.log('   - Schema mismatches');
		}
	}

	// Test connectivity to Supabase
	async testConnectivity(): Promise<boolean> {
		try {
			// Try to get messages (should return empty array if no messages exist)
			await getMessages(this.testChannelId, 1);
			console.log('✅ Supabase connectivity test passed');
			return true;
		} catch (error) {
			console.error('❌ Supabase connectivity test failed:', error);
			console.log('💡 Check:');
			console.log('   - Supabase URL and keys in supabaseData.ts');
			console.log('   - Network connectivity');
			console.log('   - Supabase project status');
			return false;
		}
	}
}

// Export for use in browser console or testing framework
export { MessagingTester };

// Auto-run tests if this file is executed directly
if (typeof window !== 'undefined') {
	// Browser environment - expose to console
	(window as any).runMessagingTests = async () => {
		const tester = new MessagingTester();
		
		console.log('🔗 Testing Supabase connectivity...');
		const isConnected = await tester.testConnectivity();
		
		if (isConnected) {
			await tester.runAllTests();
		} else {
			console.log('❌ Cannot proceed with tests due to connectivity issues');
		}
	};
	
	console.log('💡 To run messaging tests, use: runMessagingTests()');
}
