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
  
  const fileName = `${userId}/${Date.now()}-${file.originalname}`;
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Supabase URL: ${process.env.SUPABASE_URL}`);
});
