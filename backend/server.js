require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const supabase = require('./config/supabase');

const app = express();
const PORT = process.env.PORT || 5000;

// In-memory storage for typing indicators (in production, use Redis or database)
const typingIndicators = new Map(); // conversation_id -> [{ user_id, username, display_name, timestamp }]

app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

// Helper function to upload file to Supabase storage
const uploadToStorage = async (file, folder, userId) => {
  if (!file) return null;
  
  const fileName = `${Date.now()}-${file.originalname}`;
  const { data, error } = await supabase.storage
    .from('assets')
    .upload(`${folder}/${fileName}`, file.buffer, {
      contentType: file.mimetype,
      upsert: false
    });

  if (error) {
    console.error('Storage upload error:', error);
    throw error;
  }

  const { data: { publicUrl } } = supabase.storage
    .from('assets')
    .getPublicUrl(`${folder}/${fileName}`);

  return publicUrl;
};

app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    console.log('Login attempt for:', email);

    // Authenticate with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      console.error('Supabase auth error:', error);
      
      // Handle specific error messages
      let errorMessage = 'Login failed';
      if (error.message === 'Invalid login credentials') {
        errorMessage = 'Invalid email or password';
      } else if (error.message.includes('Email not confirmed')) {
        errorMessage = 'Please confirm your email address';
      } else if (error.message.includes('Invalid email')) {
        errorMessage = 'Invalid email format';
      }

      return res.status(401).json({
        success: false,
        message: errorMessage,
        error: error.message
      });
    }

    // Successful login
    console.log('Login successful for:', email);
    
    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: data.user.id,
        email: data.user.email,
        created_at: data.user.created_at
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at
      }
    });

  } catch (error) {
    console.error('Server error during login:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.post('/api/auth/register', async (req, res) => {
  const { email, password, displayName } = req.body;
  
  try {
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    console.log('Registration attempt for:', email);

    // Create user with Supabase
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          display_name: displayName || email.split('@')[0]
        }
      }
    });

    if (error) {
      console.error('Supabase registration error:', error);
      
      let errorMessage = 'Registration failed';
      if (error.message.includes('User already registered')) {
        errorMessage = 'An account with this email already exists';
      } else if (error.message.includes('Password should be at least')) {
        errorMessage = 'Password should be at least 6 characters';
      } else if (error.message.includes('Invalid email')) {
        errorMessage = 'Invalid email format';
      }

      return res.status(400).json({
        success: false,
        message: errorMessage,
        error: error.message
      });
    }

    console.log('Registration successful for:', email);
    
    res.json({
      success: true,
      message: 'Registration successful. Please check your email to confirm your account.',
      user: {
        id: data.user.id,
        email: data.user.email,
        created_at: data.user.created_at
      }
    });

  } catch (error) {
    console.error('Server error during registration:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.post('/api/profile/complete', upload.fields([
  { name: 'profilePicture', maxCount: 1 },
  { name: 'bannerImage', maxCount: 1 }
]), async (req, res) => {
  const { displayName, username, bio } = req.body;
  const profilePictureFile = req.files?.profilePicture?.[0];
  const bannerImageFile = req.files?.bannerImage?.[0];
  
  try {
    // Get user from token
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    console.log('Profile submission attempt with token:', token.substring(0, 20) + '...');

    // Verify token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError) {
      console.error('Auth error:', authError);
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token',
        error: authError.message
      });
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('User authenticated:', user.id);

    // Upload images to storage if provided
    let profilePictureUrl = null;
    let bannerImageUrl = null;

    if (profilePictureFile) {
      try {
        profilePictureUrl = await uploadToStorage(profilePictureFile, 'profiles/pfps', user.id);
        console.log('Profile picture uploaded:', profilePictureUrl);
      } catch (uploadError) {
        console.error('Profile picture upload failed:', uploadError);
        return res.status(500).json({
          success: false,
          message: 'Failed to upload profile picture',
          error: uploadError.message
        });
      }
    }

    if (bannerImageFile) {
      try {
        bannerImageUrl = await uploadToStorage(bannerImageFile, 'profiles/banners', user.id);
        console.log('Banner image uploaded:', bannerImageUrl);
      } catch (uploadError) {
        console.error('Banner image upload failed:', uploadError);
        return res.status(500).json({
          success: false,
          message: 'Failed to upload banner image',
          error: uploadError.message
        });
      }
    }

    // Update user profile in database
    const profileData = {
      id: user.id,
      username: username,
      display_name: displayName,
      bio: bio || null,
      updated_at: new Date().toISOString()
    };

    if (profilePictureUrl) {
      profileData.pfp = profilePictureUrl;
    }

    if (bannerImageUrl) {
      profileData.banner = bannerImageUrl;
    }

    console.log('Updating profile with data:', profileData);

    const { data, error } = await supabase
      .from('users')
      .upsert(profileData)
      .select()
      .single();

    if (error) {
      console.error('Database update error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update profile',
        error: error.message
      });
    }

    console.log('Profile updated successfully for user:', user.id);
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: data
    });

  } catch (error) {
    console.error('Profile completion error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get all vaults
app.get('/api/vaults', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Verify token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token'
      });
    }

    // Fetch vaults from database
    const { data, error } = await supabase
      .from('vaults')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch vaults',
        error: error.message
      });
    }

    res.json({
      success: true,
      vaults: data
    });

  } catch (error) {
    console.error('Vault fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Join vault (create vault member - role assignment is handled by Supabase trigger)
app.post('/api/vaults/join', async (req, res) => {
  const { vaultId } = req.body;
  
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Verify token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token'
      });
    }

    console.log('User joining vault:', { userId: user.id, vaultId });

    // Check if user is already a member
    const { data: existingMember, error: memberCheckError } = await supabase
      .from('vault_members')
      .select('*')
      .eq('user_id', user.id)
      .eq('vault_id', vaultId)
      .single();

    if (existingMember) {
      return res.status(400).json({
        success: false,
        message: 'You are already a member of this vault'
      });
    }

    // Create vault member (role assignment is handled automatically by Supabase trigger)
    const { data: memberData, error: memberError } = await supabase
      .from('vault_members')
      .insert({
        user_id: user.id,
        vault_id: vaultId,
        joined_at: new Date().toISOString(),
        last_accessed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (memberError) {
      console.error('Member creation error:', memberError);
      return res.status(500).json({
        success: false,
        message: 'Failed to join vault',
        error: memberError.message
      });
    }

    console.log('Successfully joined vault:', { userId: user.id, vaultId });
    
    res.json({
      success: true,
      message: 'Successfully joined vault',
      member: memberData
    });

  } catch (error) {
    console.error('Vault join error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get public vaults (for joining)
app.get('/api/vaults/public', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Verify token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token'
      });
    }

    // Fetch public vaults with member counts
    const { data, error } = await supabase
      .from('vaults')
      .select(`
        id,
        name,
        description,
        icon,
        created_at,
        vault_members(count)
      `)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch public vaults',
        error: error.message
      });
    }

    // Format vaults with member count
    const vaults = data.map(vault => ({
      ...vault,
      member_count: vault.vault_members?.[0]?.count || 0
    }));

    res.json({
      success: true,
      vaults: vaults
    });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Join vault
app.post('/api/vaults/:vaultId/join', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const { vaultId } = req.params;
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Verify token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token'
      });
    }

    // Check if vault exists
    const { data: vault, error: vaultError } = await supabase
      .from('vaults')
      .select('id, name')
      .eq('id', vaultId)
      .single();

    if (vaultError || !vault) {
      return res.status(404).json({
        success: false,
        message: 'Vault not found'
      });
    }

    // Check if user is already a member
    const { data: existingMember, error: memberError } = await supabase
      .from('vault_members')
      .select('user_id')
      .eq('vault_id', vaultId)
      .eq('user_id', user.id)
      .single();

    if (existingMember) {
      return res.status(400).json({
        success: false,
        message: 'Already a member of this vault'
      });
    }

    // Add user to vault
    const { data: newMember, error: joinError } = await supabase
      .from('vault_members')
      .insert({
        vault_id: vaultId,
        user_id: user.id,
        joined_at: new Date().toISOString()
      })
      .select()
      .single();

    if (joinError) {
      console.error('Join vault error:', joinError);
      return res.status(500).json({
        success: false,
        message: 'Failed to join vault',
        error: joinError.message
      });
    }

    console.log('User joined vault:', { userId: user.id, vaultId, vaultName: vault.name });
    
    res.json({
      success: true,
      message: 'Successfully joined vault',
      member: newMember
    });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get user's vaults
app.get('/api/vaults/user', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Verify token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token'
      });
    }

    // Fetch user's vaults
    const { data, error } = await supabase
      .from('vault_members')
      .select(`
        vault_id,
        vaults (
          id,
          name,
          description,
          icon,
          banner
        )
      `)
      .eq('user_id', user.id);

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch user vaults',
        error: error.message
      });
    }

    const vaults = data.map(member => member.vaults);

    res.json({
      success: true,
      vaults: vaults
    });

  } catch (error) {
    console.error('User vaults fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get vault chats
app.get('/api/vaults/:vaultId/chats', async (req, res) => {
  try {
    const { vaultId } = req.params;
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Verify token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token'
      });
    }

    // Check if user is member of vault
    const { data: memberCheck, error: memberError } = await supabase
      .from('vault_members')
      .select('*')
      .eq('user_id', user.id)
      .eq('vault_id', vaultId)
      .single();

    if (memberError || !memberCheck) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this vault'
      });
    }

    // Fetch categories for this vault, sorted by position
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .eq('vault_id', vaultId)
      .order('position', { ascending: true });

    if (categoriesError) {
      console.error('Categories fetch error:', categoriesError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch categories',
        error: categoriesError.message
      });
    }

    // Fetch chats for all categories in this vault
    const { data: chats, error: chatsError } = await supabase
      .from('chats')
      .select('*')
      .in('category_id', categories.map(cat => cat.id))
      .order('position', { ascending: true });

    if (chatsError) {
      console.error('Chats fetch error:', chatsError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch chats',
        error: chatsError.message
      });
    }

    // Organize chats by category
    const organizedData = categories.map(category => {
      const categoryChats = chats.filter(chat => chat.category_id === category.id);
      return {
        ...category,
        chats: categoryChats
      };
    });

    res.json({
      success: true,
      categories: organizedData,
      allChats: chats
    });

  } catch (error) {
    console.error('Vault chats fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get vault members
app.get('/api/vaults/:vaultId/members', async (req, res) => {
  try {
    const { vaultId } = req.params;
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Verify token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token'
      });
    }

    // Check if user is member of vault
    const { data: memberCheck, error: memberError } = await supabase
      .from('vault_members')
      .select('*')
      .eq('user_id', user.id)
      .eq('vault_id', vaultId)
      .single();

    if (memberError || !memberCheck) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this vault'
      });
    }

    // Fetch vault members with user details and roles
    const { data, error } = await supabase
      .from('vault_members')
      .select(`
        user_id,
        joined_at,
        users (
          id,
          username,
          display_name,
          pfp
        ),
        vault_member_roles!left(
          roles!left(
            id,
            name,
            color,
            picture,
            position
          )
        )
      `)
      .eq('vault_id', vaultId);

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch vault members',
        error: error.message
      });
    }

    // Organize members by roles
    const membersByRole = {};
    const membersWithoutRoles = [];
    
    data.forEach(member => {
      // Debug log to see the structure
      console.log('Member structure:', JSON.stringify(member, null, 2));
      
      const roleArray = member.vault_member_roles;
      if (!roleArray || roleArray.length === 0) {
        console.log('No role data found for member:', member.user_id);
        // Add to members without roles
        membersWithoutRoles.push({
          ...member.users,
          joined_at: member.joined_at
        });
        return;
      }
      
      const role = roleArray[0].roles; // Get first role from array
      const roleKey = role.id;
      
      if (!membersByRole[roleKey]) {
        membersByRole[roleKey] = {
          id: role.id,
          name: role.name,
          color: role.color,
          picture: role.picture,
          position: role.position,
          members: []
        };
      }
      
      membersByRole[roleKey].members.push({
        ...member.users,
        joined_at: member.joined_at
      });
    });

    // Add members without roles to a default role if any exist
    if (membersWithoutRoles.length > 0) {
      membersByRole['no-role'] = {
        id: 'no-role',
        name: 'Members',
        color: '#ffffff',
        picture: null,
        position: -1, // Show last
        members: membersWithoutRoles
      };
    }

    // Convert to array and sort by position (highest first)
    const sortedRoles = Object.values(membersByRole).sort((a, b) => b.position - a.position);

    res.json({
      success: true,
      roles: sortedRoles
    });

  } catch (error) {
    console.error('Vault members fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get user profile
app.get('/api/user/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Verify token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token'
      });
    }

    // Fetch user profile from users table
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch user profile',
        error: error.message
      });
    }

    res.json({
      success: true,
      user: data
    });

  } catch (error) {
    console.error('User profile fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update message
app.put('/api/messages/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token || !messageId || !content) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Verify token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token'
      });
    }

    // Get message to verify ownership
    const { data: messageData, error: messageError } = await supabase
      .from('messages')
      .select(`
        id,
        content,
        chat_id,
        user_id,
        created_at
      `)
      .eq('id', messageId)
      .single();

    if (messageError || !messageData) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check if user is member of vault that contains this chat
    const { data: chatData, error: chatError } = await supabase
      .from('chats')
      .select(`
        id,
        category_id,
        categories!inner(
          id,
          vault_id
        )
      `)
      .eq('id', messageData.chat_id)
      .single();

    if (chatError || !chatData) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    const vaultId = chatData.categories.vault_id;

    const { data: memberCheck, error: memberError } = await supabase
      .from('vault_members')
      .select('*')
      .eq('user_id', user.id)
      .eq('vault_id', vaultId)
      .single();

    if (memberError || !memberCheck) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this chat'
      });
    }

    // Verify user owns the message
    if (messageData.user_id !== user.id) {
      return res.status(403).json({
        success: false,
        message: 'Can only edit your own messages'
      });
    }

    // Update message
    const { data, error } = await supabase
      .from('messages')
      .update({
        content: content.trim(),
        is_edited: true,
        edited_at: new Date().toISOString()
      })
      .eq('id', messageId)
      .select(`
        id,
        content,
        created_at,
        updated_at,
        is_edited,
        edited_at,
        pinned_position,
        reactions,
        reply_to_id,
        user_id,
        users!inner(
          id,
          username,
          display_name,
          pfp
        )
      `)
      .single();

    if (error) {
      console.error('Message update error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update message',
        error: error.message
      });
    }

    console.log('Message updated successfully:', data);
    
    res.json({
      success: true,
      message: data
    });

  } catch (error) {
    console.error('Message update error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get chat messages
app.get('/api/chats/:chatId/messages', async (req, res) => {
  try {
    const { chatId } = req.params;
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Verify token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token'
      });
    }

    // Check if user is member of the vault that contains this chat
    const { data: chatData, error: chatError } = await supabase
      .from('chats')
      .select(`
        id,
        category_id,
        categories!inner(
          id,
          vault_id
        )
      `)
      .eq('id', chatId)
      .single();

    if (chatError || !chatData) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    const vaultId = chatData.categories.vault_id;

    const { data: memberCheck, error: memberError } = await supabase
      .from('vault_members')
      .select('*')
      .eq('user_id', user.id)
      .eq('vault_id', vaultId)
      .single();

    if (memberError || !memberCheck) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this chat'
      });
    }

    // Fetch messages for this chat with user roles
    const { data, error } = await supabase
      .from('messages')
      .select(`
        id,
        content,
        created_at,
        updated_at,
        is_edited,
        edited_at,
        pinned_position,
        reactions,
        reply_to_id,
        attachments,
        user_id,
        users!inner(
          id,
          username,
          display_name,
          pfp
        )
      `)
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Messages fetch error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch messages',
        error: error.message
      });
    }

    // Fetch reply information for messages that have replies
    const replyIds = data.filter(msg => msg.reply_to_id).map(msg => msg.reply_to_id);
    let replyData = {};
    
    if (replyIds.length > 0) {
      const { data: replies, error: replyError } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          users!inner(
            id,
            username,
            display_name,
            pfp
          )
        `)
        .in('id', replyIds);

      if (!replyError && replies) {
        replyData = replies.reduce((acc, reply) => {
          acc[reply.id] = reply;
          return acc;
        }, {});
      }
    }

    // Fetch user roles for all message authors
    const userIds = [...new Set(data.map(msg => msg.user_id))];
    const { data: userRoles, error: roleError } = await supabase
      .from('vault_member_roles')
      .select(`
        user_id,
        roles!inner(
          id,
          name,
          color,
          picture,
          position
        )
      `)
      .eq('vault_id', vaultId)
      .in('user_id', userIds);

    // Create role lookup map
    const roleMap = {};
    if (!roleError && userRoles) {
      userRoles.forEach(userRole => {
        roleMap[userRole.user_id] = userRole.roles;
      });
    }

    // Merge reply data and role information into messages
    const messagesWithReplies = data.map(message => ({
      ...message,
      reply_to: message.reply_to_id ? replyData[message.reply_to_id] : null,
      user_role: roleMap[message.user_id] || null
    }));

    res.json({
      success: true,
      messages: messagesWithReplies
    });

  } catch (error) {
    console.error('Chat messages fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Send message
app.post('/api/messages', async (req, res) => {
  try {
    const { chat_id, content, reply_to_id, attachment } = req.body;
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token || !chat_id) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Verify token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token'
      });
    }

    // If reply_to_id is provided, verify the replied message exists and is in the same chat
    let replyData = null;
    if (reply_to_id) {
      const { data: replyCheck, error: replyError } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          chat_id,
          users!inner(
            id,
            username,
            display_name,
            pfp
          )
        `)
        .eq('id', reply_to_id)
        .eq('chat_id', chat_id)
        .single();

      if (replyError || !replyCheck) {
        return res.status(400).json({
          success: false,
          message: 'Invalid reply message'
        });
      }
      replyData = replyCheck;
    }

    // Check if user is member of the vault that contains this chat
    const { data: chatData, error: chatError } = await supabase
      .from('chats')
      .select(`
        id,
        category_id,
        categories!inner(
          id,
          vault_id
        )
      `)
      .eq('id', chat_id)
      .single();

    if (chatError || !chatData) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    const vaultId = chatData.categories.vault_id;

    const { data: memberCheck, error: memberError } = await supabase
      .from('vault_members')
      .select('*')
      .eq('user_id', user.id)
      .eq('vault_id', vaultId)
      .single();

    if (memberError || !memberCheck) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this chat'
      });
    }

    // Create message
    const { data, error } = await supabase
      .from('messages')
      .insert({
        chat_id: chat_id,
        user_id: user.id,
        content: content ? content.trim() : null,
        type: 'text', // Always use 'text' type, attachments stored in JSONB
        reply_to_id: reply_to_id || null,
        attachments: attachment ? [attachment] : null,
        created_at: new Date().toISOString()
      })
      .select(`
        id,
        content,
        created_at,
        updated_at,
        is_edited,
        edited_at,
        pinned_position,
        reactions,
        reply_to_id,
        attachments,
        user_id,
        users!inner(
          id,
          username,
          display_name,
          pfp
        )
      `)
      .single();

    if (error) {
      console.error('Message creation error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to send message',
        error: error.message
      });
    }

    // Fetch reply information if this is a reply
    let messageWithReply = { ...data, reply_to: null };
    if (data.reply_to_id) {
      const { data: replyInfo, error: replyError } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          users!inner(
            id,
            username,
            display_name,
            pfp
          )
        `)
        .eq('id', data.reply_to_id)
        .single();

      if (!replyError && replyInfo) {
        messageWithReply.reply_to = replyInfo;
      }
    }

    console.log('Message sent successfully:', data);
    
    res.json({
      success: true,
      message: messageWithReply
    });

  } catch (error) {
    console.error('Message send error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Add reaction to message
app.post('/api/messages/:messageId/reactions', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const { messageId } = req.params;
    const { emoji } = req.body;
    
    if (!token || !emoji) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Verify token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token'
      });
    }

    // Get message and check vault access
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select(`
        chat_id,
        reactions
      `)
      .eq('id', messageId)
      .single();

    if (messageError || !message) {
      console.error('Message not found:', messageError);
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Get chat to find vault_id
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select('category_id')
      .eq('id', message.chat_id)
      .single();

    if (chatError || !chat) {
      console.error('Chat not found:', chatError);
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Get category to find vault_id
    const { data: category, error: categoryError } = await supabase
      .from('categories')
      .select('vault_id')
      .eq('id', chat.category_id)
      .single();

    if (categoryError || !category) {
      console.error('Category not found:', categoryError);
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if user is member of the vault
    const { data: member, error: memberError } = await supabase
      .from('vault_members')
      .select('user_id')
      .eq('vault_id', category.vault_id)
      .eq('user_id', user.id)
      .single();

    if (memberError || !member) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this message'
      });
    }

    // Update reactions
    let reactions = message.reactions || {};
    if (!reactions[emoji]) {
      reactions[emoji] = [];
    }
    
    // Add user to reaction if not already present
    if (!reactions[emoji].includes(user.id)) {
      reactions[emoji].push(user.id);
    }

    // Update message with new reactions
    const { data: updatedMessage, error: updateError } = await supabase
      .from('messages')
      .update({ reactions })
      .eq('id', messageId)
      .select('reactions')
      .single();

    if (updateError) {
      console.error('Reaction update error:', updateError);
      return res.status(500).json({
        success: false,
        message: 'Failed to update reaction'
      });
    }

    console.log('Reaction added successfully:', { messageId, emoji, userId: user.id });
    
    res.json({
      success: true,
      reactions: updatedMessage.reactions
    });

  } catch (error) {
    console.error('Add reaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Remove reaction from message
app.delete('/api/messages/:messageId/reactions', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const { messageId } = req.params;
    const { emoji } = req.body;
    
    if (!token || !emoji) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Verify token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token'
      });
    }

    // Get message and check vault access
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select(`
        chat_id,
        reactions
      `)
      .eq('id', messageId)
      .single();

    if (messageError || !message) {
      console.error('Message not found:', messageError);
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Get chat to find vault_id
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select('category_id')
      .eq('id', message.chat_id)
      .single();

    if (chatError || !chat) {
      console.error('Chat not found:', chatError);
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Get category to find vault_id
    const { data: category, error: categoryError } = await supabase
      .from('categories')
      .select('vault_id')
      .eq('id', chat.category_id)
      .single();

    if (categoryError || !category) {
      console.error('Category not found:', categoryError);
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if user is member of the vault
    const { data: member, error: memberError } = await supabase
      .from('vault_members')
      .select('user_id')
      .eq('vault_id', category.vault_id)
      .eq('user_id', user.id)
      .single();

    if (memberError || !member) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this message'
      });
    }

    // Update reactions
    let reactions = message.reactions || {};
    if (reactions[emoji]) {
      // Remove user from reaction
      reactions[emoji] = reactions[emoji].filter(id => id !== user.id);
      
      // Remove emoji if no users left
      if (reactions[emoji].length === 0) {
        delete reactions[emoji];
      }
    }

    // Update message with new reactions
    const { data: updatedMessage, error: updateError } = await supabase
      .from('messages')
      .update({ reactions })
      .eq('id', messageId)
      .select('reactions')
      .single();

    if (updateError) {
      console.error('Reaction update error:', updateError);
      return res.status(500).json({
        success: false,
        message: 'Failed to update reaction'
      });
    }

    console.log('Reaction removed successfully:', { messageId, emoji, userId: user.id });
    
    res.json({
      success: true,
      reactions: updatedMessage.reactions
    });

  } catch (error) {
    console.error('Remove reaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get user profile with vault role
app.get('/api/users/:userId/profile', async (req, res) => {
  try {
    const { userId } = req.params;
    const { vault_id } = req.query;
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Verify token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token'
      });
    }

    // Check if user is member of the vault
    const { data: memberCheck, error: memberError } = await supabase
      .from('vault_members')
      .select('*')
      .eq('user_id', user.id)
      .eq('vault_id', vault_id)
      .single();

    if (memberError || !memberCheck) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this vault'
      });
    }

    // Fetch user profile
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, username, display_name, pfp, bio, banner')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Fetch user's role in this vault
    const { data: roleData, error: roleError } = await supabase
      .from('vault_members')
      .select(`
        roles!inner(
          name
        )
      `)
      .eq('user_id', userId)
      .eq('vault_id', vault_id)
      .single();

    const vaultRole = roleError || !roleData ? null : roleData.roles.name;

    res.json({
      success: true,
      user: {
        ...userData,
        vault_role: vaultRole
      }
    });

  } catch (error) {
    console.error('User profile fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Send direct message
app.post('/api/direct-messages', async (req, res) => {
  try {
    const { recipient_id, content } = req.body;
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token || !recipient_id || !content) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Verify token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token'
      });
    }

    // For now, just return success (we can implement actual DM storage later)
    res.json({
      success: true,
      message: 'Direct message sent successfully'
    });

  } catch (error) {
    console.error('Direct message send error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Send friend request
app.post('/api/friend-requests', async (req, res) => {
  try {
    const { receiver_username } = req.body;
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token || !receiver_username) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Verify token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token'
      });
    }

    // Find receiver by username
    const { data: receiver, error: receiverError } = await supabase
      .from('users')
      .select('id, username, display_name, pfp')
      .eq('username', receiver_username)
      .single();

    if (receiverError || !receiver) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if already friends
    const { data: existingFriendship } = await supabase
      .from('friendships')
      .select('*')
      .or(`(user_id.eq.${user.id},friend_id.eq.${receiver.id}),(user_id.eq.${receiver.id},friend_id.eq.${user.id})`)
      .single();

    if (existingFriendship) {
      return res.status(400).json({
        success: false,
        message: 'Already friends with this user'
      });
    }

    // Check if request already exists
    const { data: existingRequest } = await supabase
      .from('friend_requests')
      .select('*')
      .or(`(sender_id.eq.${user.id},receiver_id.eq.${receiver.id}),(sender_id.eq.${receiver.id},receiver_id.eq.${user.id})`)
      .eq('status', 'pending')
      .single();

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: 'Friend request already sent'
      });
    }

    // Create friend request
    const { data: friendRequest, error: requestError } = await supabase
      .from('friend_requests')
      .insert({
        sender_id: user.id,
        receiver_id: receiver.id,
        message: 'Would like to be friends!'
      })
      .select(`
        *,
        sender:sender_id(id, username, display_name, pfp),
        receiver:receiver_id(id, username, display_name, pfp)
      `)
      .single();

    if (requestError) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send friend request',
        error: requestError.message
      });
    }

    res.json({
      success: true,
      message: 'Friend request sent successfully',
      request: friendRequest
    });

  } catch (error) {
    console.error('Friend request send error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get sent friend requests
app.get('/api/friend-requests/sent', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Verify token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token'
      });
    }

    // Get sent friend requests
    const { data: requests, error: requestsError } = await supabase
      .from('friend_requests')
      .select(`
        sender_id,
        receiver_id,
        message,
        status,
        created_at,
        receiver:receiver_id(id, username, display_name, pfp)
      `)
      .eq('sender_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (requestsError) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch sent friend requests',
        error: requestsError.message
      });
    }

    res.json({
      success: true,
      requests: requests
    });

  } catch (error) {
    console.error('Sent friend requests fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get common vaults between two users
app.get('/api/users/:userId/common-vaults', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Verify token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token'
      });
    }

    const { userId } = req.params;

    // Get vaults where both users are members
    const { data: userVaults, error: userVaultsError } = await supabase
      .from('vault_members')
      .select('vault_id')
      .eq('user_id', user.id);

    if (userVaultsError) {
      console.error('User vaults fetch error:', userVaultsError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch user vaults'
      });
    }

    const { data: otherUserVaults, error: otherUserVaultsError } = await supabase
      .from('vault_members')
      .select('vault_id')
      .eq('user_id', userId);

    if (otherUserVaultsError) {
      console.error('Other user vaults fetch error:', otherUserVaultsError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch other user vaults'
      });
    }

    // Find common vault IDs
    const userVaultIds = userVaults.map(item => item.vault_id);
    const otherUserVaultIds = otherUserVaults.map(item => item.vault_id);
    const commonVaultIds = userVaultIds.filter(id => otherUserVaultIds.includes(id));

    if (commonVaultIds.length === 0) {
      return res.json({
        success: true,
        commonVaults: []
      });
    }

    // Get vault details for common vaults
    const { data: commonVaults, error: commonVaultsError } = await supabase
      .from('vaults')
      .select('id, name, icon')
      .in('id', commonVaultIds);

    if (commonVaultsError) {
      console.error('Common vaults fetch error:', commonVaultsError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch common vaults'
      });
    }

    res.json({
      success: true,
      commonVaults: commonVaults
    });

  } catch (error) {
    console.error('Common vaults fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Create or get DM conversation
app.post('/api/dm-conversations', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const { participant_id } = req.body;
    
    if (!token || !participant_id) {
      return res.status(400).json({
        success: false,
        message: 'Authentication and participant ID required'
      });
    }

    // Verify token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token'
      });
    }

    // Check if conversation already exists
    const { data: userConversations, error: userConversationsError } = await supabase
      .from('dm_participants')
      .select('conversation_id')
      .eq('user_id', user.id);

    if (userConversationsError) {
      console.error('User conversations fetch error:', userConversationsError);
    }

    if (userConversations && userConversations.length > 0) {
      const conversationIds = userConversations.map(c => c.conversation_id);
      
      const { data: existingConversation, error: existingError } = await supabase
        .from('dm_participants')
        .select('conversation_id')
        .eq('user_id', participant_id)
        .in('conversation_id', conversationIds);

      if (existingError) {
        console.error('Existing conversation check error:', existingError);
      }

      if (existingConversation && existingConversation.length > 0) {
        // Get full conversation details
        const { data: conversationDetails, error: detailsError } = await supabase
          .from('dm_conversations')
          .select('*')
          .eq('id', existingConversation[0].conversation_id)
          .single();

        return res.json({
          success: true,
          conversation: conversationDetails
        });
      }
    }

    // No existing conversation - return null (will be created when first message is sent)
    res.json({
      success: true,
      conversation: null
    });

  } catch (error) {
    console.error('DM conversation creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get DM messages
app.get('/api/dm-conversations/:conversationId/messages', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const { conversationId } = req.params;
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Verify token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token'
      });
    }

    // Verify user is participant in conversation
    const { data: participant, error: participantError } = await supabase
      .from('dm_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (participantError || !participant) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this conversation'
      });
    }

    // Get messages
    const { data: messages, error: messagesError } = await supabase
      .from('dm_messages')
      .select(`
        id,
        content,
        created_at,
        is_edited,
        edited_at,
        reply_to_id,
        attachments,
        reactions,
        user_id,
        user:user_id(id, username, display_name, pfp)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('Messages fetch error:', messagesError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch messages',
        error: messagesError.message
      });
    }

    // Fetch reply information for messages that have replies
    const replyIds = messages.filter(msg => msg.reply_to_id).map(msg => msg.reply_to_id);
    let replyData = {};
    
    if (replyIds.length > 0) {
      const { data: replies, error: replyError } = await supabase
        .from('dm_messages')
        .select(`
          id,
          content,
          user:user_id(id, username, display_name, pfp)
        `)
        .in('id', replyIds);

      if (!replyError && replies) {
        replyData = replies.reduce((acc, reply) => {
          acc[reply.id] = reply;
          return acc;
        }, {});
      }
    }

    // Merge reply data into messages
    const messagesWithReplies = messages.map(message => ({
      ...message,
      reply_to: message.reply_to_id ? replyData[message.reply_to_id] : null
    }));

    res.json({
      success: true,
      messages: messagesWithReplies
    });

  } catch (error) {
    console.error('DM messages fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Send DM message
app.post('/api/dm-messages', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const { conversation_id, content, reply_to_id, attachment } = req.body;
    
    if (!token || !conversation_id) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Verify token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token'
      });
    }

    // Check if user is participant in the conversation
    const { data: participant, error: participantError } = await supabase
      .from('dm_participants')
      .select('user_id')
      .eq('conversation_id', conversation_id)
      .eq('user_id', user.id)
      .single();

    if (participantError || !participant) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this conversation'
      });
    }

    // Create message
    const { data, error } = await supabase
      .from('dm_messages')
      .insert({
        conversation_id: conversation_id,
        user_id: user.id,
        content: content ? content.trim() : null,
        type: 'text', // Always use 'text' type, attachments stored in JSONB
        reply_to_id: reply_to_id || null,
        attachments: attachment ? [attachment] : null,
        created_at: new Date().toISOString()
      })
      .select(`
        id,
        content,
        created_at,
        updated_at,
        is_edited,
        edited_at,
        reply_to_id,
        attachments,
        user_id,
        user:user_id(id, username, display_name, pfp)
      `)
      .single();

    if (error) {
      console.error('DM message creation error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to send message',
        error: error.message
      });
    }

    res.json({
      success: true,
      message: data
    });

  } catch (error) {
    console.error('DM message send error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update DM message
app.put('/api/dm-messages/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token || !messageId || !content) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Verify token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token'
      });
    }

    // Get message to verify ownership
    const { data: messageData, error: messageError } = await supabase
      .from('dm_messages')
      .select(`
        id,
        content,
        conversation_id,
        user_id,
        created_at
      `)
      .eq('id', messageId)
      .single();

    if (messageError || !messageData) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Verify user is participant in the conversation
    const { data: participant, error: participantError } = await supabase
      .from('dm_participants')
      .select('user_id')
      .eq('conversation_id', messageData.conversation_id)
      .eq('user_id', user.id)
      .single();

    if (participantError || !participant) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this conversation'
      });
    }

    // Verify user owns the message
    if (messageData.user_id !== user.id) {
      return res.status(403).json({
        success: false,
        message: 'Can only edit your own messages'
      });
    }

    // Update message
    const { data, error } = await supabase
      .from('dm_messages')
      .update({
        content: content.trim(),
        is_edited: true,
        edited_at: new Date().toISOString()
      })
      .eq('id', messageId)
      .select(`
        id,
        content,
        created_at,
        updated_at,
        is_edited,
        edited_at,
        conversation_id,
        user_id,
        user:user_id(id, username, display_name, pfp)
      `)
      .single();

    if (error) {
      console.error('DM message update error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update message',
        error: error.message
      });
    }

    console.log('DM message updated successfully:', data);
    
    res.json({
      success: true,
      message: data
    });

  } catch (error) {
    console.error('DM message update error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Add reaction to DM message
app.post('/api/dm-messages/:messageId/reactions', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const { messageId } = req.params;
    const { emoji } = req.body;
    
    if (!token || !emoji) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Verify token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token'
      });
    }

    // Get DM message and check conversation access
    const { data: message, error: messageError } = await supabase
      .from('dm_messages')
      .select(`
        conversation_id,
        reactions
      `)
      .eq('id', messageId)
      .single();

    if (messageError || !message) {
      console.error('DM message not found:', messageError);
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    console.log('DM message found:', { messageId, conversationId: message.conversation_id, userId: user.id });

    // Check if user is participant in the conversation
    const { data: participant, error: participantError } = await supabase
      .from('dm_participants')
      .select('user_id')
      .eq('conversation_id', message.conversation_id)
      .eq('user_id', user.id)
      .single();

    // Debug: Check all participants in this conversation
    const { data: allParticipants, error: allParticipantsError } = await supabase
      .from('dm_participants')
      .select('user_id')
      .eq('conversation_id', message.conversation_id);

    console.log('All participants in conversation:', { allParticipants, allParticipantsError });
    console.log('Participant check:', { participant, participantError });

    if (participantError || !participant) {
      console.error('Access denied - user not participant:', { participantError, conversationId: message.conversation_id, userId: user.id });
      return res.status(403).json({
        success: false,
        message: 'Access denied to this message'
      });
    }

    // Update reactions
    let reactions = message.reactions || {};
    if (!reactions[emoji]) {
      reactions[emoji] = [];
    }
    
    // Add user to reaction if not already present
    if (!reactions[emoji].includes(user.id)) {
      reactions[emoji].push(user.id);
    }

    // Update message with new reactions
    const { data: updatedMessage, error: updateError } = await supabase
      .from('dm_messages')
      .update({ reactions })
      .eq('id', messageId)
      .select('reactions')
      .single();

    if (updateError) {
      console.error('DM reaction update error:', updateError);
      return res.status(500).json({
        success: false,
        message: 'Failed to update reaction'
      });
    }

    console.log('DM reaction added successfully:', { messageId, emoji, userId: user.id });
    
    res.json({
      success: true,
      reactions: updatedMessage.reactions
    });

  } catch (error) {
    console.error('Add DM reaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Remove reaction from DM message
app.delete('/api/dm-messages/:messageId/reactions', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const { messageId } = req.params;
    const { emoji } = req.body;
    
    if (!token || !emoji) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Verify token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token'
      });
    }

    // Get DM message and check conversation access
    const { data: message, error: messageError } = await supabase
      .from('dm_messages')
      .select(`
        conversation_id,
        reactions
      `)
      .eq('id', messageId)
      .single();

    if (messageError || !message) {
      console.error('DM message not found:', messageError);
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    console.log('DM message found:', { messageId, conversationId: message.conversation_id, userId: user.id });

    // Check if user is participant in the conversation
    const { data: participant, error: participantError } = await supabase
      .from('dm_participants')
      .select('user_id')
      .eq('conversation_id', message.conversation_id)
      .eq('user_id', user.id)
      .single();

    // Debug: Check all participants in this conversation
    const { data: allParticipants, error: allParticipantsError } = await supabase
      .from('dm_participants')
      .select('user_id')
      .eq('conversation_id', message.conversation_id);

    console.log('All participants in conversation:', { allParticipants, allParticipantsError });
    console.log('Participant check:', { participant, participantError });

    if (participantError || !participant) {
      console.error('Access denied - user not participant:', { participantError, conversationId: message.conversation_id, userId: user.id });
      return res.status(403).json({
        success: false,
        message: 'Access denied to this message'
      });
    }

    // Update reactions
    let reactions = message.reactions || {};
    if (reactions[emoji]) {
      // Remove user from reaction
      reactions[emoji] = reactions[emoji].filter(id => id !== user.id);
      
      // Remove emoji if no users left
      if (reactions[emoji].length === 0) {
        delete reactions[emoji];
      }
    }

    // Update message with new reactions
    const { data: updatedMessage, error: updateError } = await supabase
      .from('dm_messages')
      .update({ reactions })
      .eq('id', messageId)
      .select('reactions')
      .single();

    if (updateError) {
      console.error('DM reaction update error:', updateError);
      return res.status(500).json({
        success: false,
        message: 'Failed to update reaction'
      });
    }

    console.log('DM reaction removed successfully:', { messageId, emoji, userId: user.id });
    
    res.json({
      success: true,
      reactions: updatedMessage.reactions
    });

  } catch (error) {
    console.error('Remove DM reaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Upload chat attachment
app.post('/api/upload/chat', upload.single('file'), async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const { chat_id } = req.body;
    const file = req.file;
    
    if (!token || !file || !chat_id) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Verify token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token'
      });
    }

    // Check if user is member of the vault that contains this chat
    const { data: chatData, error: chatError } = await supabase
      .from('chats')
      .select(`
        id,
        category_id,
        categories!inner(
          id,
          vault_id
        )
      `)
      .eq('id', chat_id)
      .single();

    if (chatError || !chatData) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    const vaultId = chatData.categories.vault_id;

    const { data: memberCheck, error: memberError } = await supabase
      .from('vault_members')
      .select('*')
      .eq('user_id', user.id)
      .eq('vault_id', vaultId)
      .single();

    if (memberError || !memberCheck) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this chat'
      });
    }

    // Upload file to storage
    const fileName = `${Date.now()}-${file.originalname}`;
    const filePath = `attachments/${fileName}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('assets')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (uploadError) {
      console.error('File upload error:', uploadError);
      return res.status(500).json({
        success: false,
        message: 'Failed to upload file',
        error: uploadError.message
      });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('assets')
      .getPublicUrl(filePath);

    // Create attachment object
    const attachment = {
      type: file.mimetype.startsWith('image/') ? 'image' : 'file',
      url: publicUrl,
      name: file.originalname,
      size: file.size,
      mime: file.mimetype
    };

    console.log('File uploaded successfully:', attachment);
    
    res.json({
      success: true,
      attachment: attachment
    });

  } catch (error) {
    console.error('Chat upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Upload DM attachment
app.post('/api/upload/dm', upload.single('file'), async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const { conversation_id } = req.body;
    const file = req.file;
    
    if (!token || !file || !conversation_id) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Verify token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token'
      });
    }

    // Check if user is participant in the conversation
    const { data: participant, error: participantError } = await supabase
      .from('dm_participants')
      .select('user_id')
      .eq('conversation_id', conversation_id)
      .eq('user_id', user.id)
      .single();

    if (participantError || !participant) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this conversation'
      });
    }

    // Upload file to storage
    const fileName = `${Date.now()}-${file.originalname}`;
    const filePath = `dm_attachments/${fileName}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('assets')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (uploadError) {
      console.error('DM file upload error:', uploadError);
      return res.status(500).json({
        success: false,
        message: 'Failed to upload file',
        error: uploadError.message
      });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('assets')
      .getPublicUrl(filePath);

    // Create attachment object
    const attachment = {
      type: file.mimetype.startsWith('image/') ? 'image' : 'file',
      url: publicUrl,
      name: file.originalname,
      size: file.size,
      mime: file.mimetype
    };

    console.log('DM file uploaded successfully:', attachment);
    
    res.json({
      success: true,
      attachment: attachment
    });

  } catch (error) {
    console.error('DM upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get pending friend requests
app.get('/api/friend-requests', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Verify token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token'
      });
    }

    // Get pending friend requests
    const { data: requests, error: requestsError } = await supabase
      .from('friend_requests')
      .select(`
        sender_id,
        receiver_id,
        message,
        status,
        created_at,
        sender:sender_id(id, username, display_name, pfp)
      `)
      .eq('receiver_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (requestsError) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch friend requests',
        error: requestsError.message
      });
    }

    res.json({
      success: true,
      requests: requests
    });

  } catch (error) {
    console.error('Friend requests fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Respond to friend request (accept/decline)
app.post('/api/friend-requests/:senderId/:receiverId/respond', async (req, res) => {
  try {
    const { senderId, receiverId } = req.params;
    const { action } = req.body; // 'accept' or 'decline'
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token || !['accept', 'decline'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request'
      });
    }

    // Verify token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token'
      });
    }

    // Get friend request using composite key
    const { data: request, error: requestError } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('sender_id', senderId)
      .eq('receiver_id', receiverId)
      .eq('status', 'pending')
      .single();

    if (requestError || !request) {
      return res.status(404).json({
        success: false,
        message: 'Friend request not found'
      });
    }

    // Update request status
    const { error: updateError } = await supabase
      .from('friend_requests')
      .update({ status: action === 'accept' ? 'accepted' : 'declined' })
      .eq('sender_id', senderId)
      .eq('receiver_id', receiverId);

    if (updateError) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update friend request',
        error: updateError.message
      });
    }

    // If accepted, create friendship
    if (action === 'accept') {
      const { error: friendshipError } = await supabase
        .from('friendships')
        .insert([
          { user_id: request.sender_id, friend_id: request.receiver_id },
        ]);

      if (friendshipError) {
        return res.status(500).json({
          success: false,
          message: 'Failed to create friendship',
          error: friendshipError.message
        });
      }
    }

    res.json({
      success: true,
      message: `Friend request ${action}ed successfully`
    });

  } catch (error) {
    console.error('Friend request response error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Handle typing indicators
app.post('/api/dm/typing', async (req, res) => {
  try {
    const { conversation_id, is_typing } = req.body;
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token || !conversation_id) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Verify token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token'
      });
    }

    // Check if user is participant in conversation
    const { data: participant, error: participantError } = await supabase
      .from('dm_participants')
      .select('*')
      .eq('conversation_id', conversation_id)
      .eq('user_id', user.id)
      .single();

    if (participantError || !participant) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this conversation'
      });
    }

    // Get user details for typing indicator
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, username, display_name')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return res.status(500).json({
        success: false,
        message: 'Failed to get user details'
      });
    }

    // Update typing indicators storage
    if (!typingIndicators.has(conversation_id)) {
      typingIndicators.set(conversation_id, []);
    }

    const conversationTyping = typingIndicators.get(conversation_id);
    
    if (is_typing) {
      // Add or update user's typing status
      const existingIndex = conversationTyping.findIndex(t => t.user_id === user.id);
      const typingInfo = {
        user_id: user.id,
        username: userData.username,
        display_name: userData.display_name,
        timestamp: Date.now()
      };
      
      if (existingIndex >= 0) {
        conversationTyping[existingIndex] = typingInfo;
      } else {
        conversationTyping.push(typingInfo);
      }
    } else {
      // Remove user's typing status
      const filteredTyping = conversationTyping.filter(t => t.user_id !== user.id);
      typingIndicators.set(conversation_id, filteredTyping);
    }
    
    res.json({
      success: true,
      message: 'Typing event processed'
    });

  } catch (error) {
    console.error('Typing event error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get typing indicators for a conversation
app.get('/api/dm/typing/:conversation_id', async (req, res) => {
  try {
    const { conversation_id } = req.params;
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Verify token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token'
      });
    }

    // Check if user is participant in conversation
    const { data: participant, error: participantError } = await supabase
      .from('dm_participants')
      .select('*')
      .eq('conversation_id', conversation_id)
      .eq('user_id', user.id)
      .single();

    if (participantError || !participant) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this conversation'
      });
    }

    // Get typing indicators for this conversation
    const conversationTyping = typingIndicators.get(conversation_id) || [];
    
    // Filter out typing indicators older than 5 seconds (cleanup)
    const now = Date.now();
    const recentTyping = conversationTyping.filter(t => now - t.timestamp < 5000);
    
    // Update storage with cleaned data
    typingIndicators.set(conversation_id, recentTyping);
    
    res.json({
      success: true,
      typing_users: recentTyping
    });

  } catch (error) {
    console.error('Get typing indicators error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get user's friends
app.get('/api/friends', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Verify token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token'
      });
    }

    // Get friends using a simpler approach
    const { data: friendships, error: friendshipsError } = await supabase
      .from('friendships')
      .select('friend_id')
      .or(`user_id.eq.${user.id}`);

    if (friendshipsError) {
      console.error('Friendships query error:', friendshipsError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch friendships',
        error: friendshipsError.message
      });
    }

    // Get friend details - handle both user_id and friend_id directions
    const { data: allFriendships, error: allFriendshipsError } = await supabase
      .from('friendships')
      .select('user_id, friend_id')
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

    if (allFriendshipsError) {
      console.error('All friendships query error:', allFriendshipsError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch all friendships',
        error: allFriendshipsError.message
      });
    }

    // Extract friend IDs from both directions
    const friendIds = allFriendships
      .map(f => f.user_id === user.id ? f.friend_id : f.user_id)
      .filter(id => id !== user.id); // Ensure we don't include self
    
    let friends = [];
    
    if (friendIds.length > 0) {
      const { data: friendData, error: friendDataError } = await supabase
        .from('users')
        .select('id, username, display_name, pfp, banner, bio, created_at')
        .in('id', friendIds);

      if (friendDataError) {
        console.error('Friend data query error:', friendDataError);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch friend data',
          error: friendDataError.message
        });
      }
      
      friends = friendData;
    }

    res.json({
      success: true,
      friends: friends
    });

  } catch (error) {
    console.error('Friends fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Supabase URL: ${process.env.SUPABASE_URL}`);
});
