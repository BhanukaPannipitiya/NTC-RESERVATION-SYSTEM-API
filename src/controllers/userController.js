const User = require('../models/userModel');
const { generateTokenAndSetCookie } = require('../utils/jwt');
const bcrypt = require('bcrypt');


//Create a user profile
const createUserProfile = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if(!email || !password || !name){
      return res.status(400).json({ message: 'Please enter all fields' });
    }

    const userAlreadyExists = await User.findOne  ({ email });  

    if (userAlreadyExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();

    const user = await User.create({ 
      name, 
      email,
      password : hashedPassword,
      role,
      verificationToken,
      verificationTokenExpiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateTokenAndSetCookie(res, user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get user profile
const getUserProfile = async (req, res) => {
  const { id } = req.body;
  try {
    const user = await User.findById(id).select('-password'); // Exclude password field
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  try {
      const user = await User.findOne({ email });

      if (!user) {
          return res.status(400).json({ success: false, message: "Invalid credentials" });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
          return res.status(400).json({ success: false, message: "Invalid credentials" });
      }
      const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();

      generateTokenAndSetCookie(res, user._id);
      user.lastlogin = Date.now();
      user.verificationToken = verificationToken;
      user.verificationTokenExpiresAt = Date.now() + 24 * 60 * 60 * 1000 // 24 hours
      await user.save();
      
      // if(email === "whitewolf.other.inno@gmail.com"){
      //     await sendAdminEmail(email,verificationToken)
      // }
      // else{
      // await sendVerificationEmail(email, verificationToken);
      // } 

      res.status(200).json({ success: true, message: "Logged in successfully", user: { ...user._doc, password: undefined } });

  } catch (error) {
      console.log("Error logging in", error);
      res.status(400).json({ success: false, message: error.message });
  }
}

// export const logout = async (req, res) => {
//   res.clearCookie("token");
//   res.status(200).json({ success: true, message: "Logged out successfully" });
// }

// Update user profile
const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;

    if (req.body.password) {
      user.password = bcrypt.hashSync(req.body.password, 10); // Hash the new password
    }

    const updatedUser = await user.save();
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getUserProfile, updateUserProfile, createUserProfile,login };
