require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const supabase = require('./config/supabase');

const app = express();
const PORT = process.env.PORT || 5000;

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

    // Fetch vault members with user details
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

    const members = data.map(member => ({
      ...member.users,
      joined_at: member.joined_at
    }));

    res.json({
      success: true,
      members: members
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

    // Fetch messages for this chat
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

    res.json({
      success: true,
      messages: data
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
    const { chat_id, content } = req.body;
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token || !chat_id || !content) {
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

    // Create message
    const { data, error } = await supabase
      .from('messages')
      .insert({
        chat_id: chat_id,
        user_id: user.id,
        content: content.trim(),
        type: 'text',
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

    console.log('Message sent successfully:', data);
    
    res.json({
      success: true,
      message: data
    });

  } catch (error) {
    console.error('Message send error:', error);
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Supabase URL: ${process.env.SUPABASE_URL}`);
});
