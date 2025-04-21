const User = require('../models/User');

const searchUsers = async (req, res) => {
    try {
        const { query } = req.query;
        console.log('Search query received:', query);

        if (!query) {
            return res.status(400).json({ message: "Search query is required" });
        }

        const users = await User.find({
            $or: [
                { name: new RegExp(query, 'i') },
                { email: new RegExp(query, 'i') }
            ]
        }).select('name email _id year');

        console.log('Search results:', users);

        if (users.length === 0) {
            return res.status(404).json({ message: "No users found" });
        }

        res.status(200).json(users);
    } catch (error) {
        console.error("❌ Error searching users:", error);
        res.status(500).json({ message: 'Error searching users', error: error.message });
    }
};

const toggleFriend = async (req, res) => {
    try {
        const { friendId } = req.body;
        const userId = req.user.userId;

        if (!friendId) {
            return res.status(400).json({ message: "Friend user ID is required" });
        }

        const user = await User.findById(userId);
        const friend = await User.findById(friendId).select('name email _id');

        if (!user || !friend) {
            return res.status(404).json({ message: "User or friend not found" });
        }

        const isFriend = user.friends.includes(friendId);

        if (isFriend) {
            user.friends = user.friends.filter(id => id.toString() !== friendId);
            await user.save();
            res.status(200).json({ 
                message: `${friend.name || 'Unknown User'} removed from friends list`, 
                friends: user.friends 
            });
        } else {
            user.friends.push(friendId);
            await user.save();
            res.status(200).json({ 
                message: `${friend.name || 'Unknown User'} added to friends list`, 
                friends: user.friends 
            });
        }
    } catch (error) {
        console.error("❌ Error toggling friend status:", error);
        res.status(500).json({ message: "Error updating friends list", error: error.message });
    }
};

const getFriendsList = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId)
            .populate('friends', 'name email _id year')
            .select('friends');

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({ friends: user.friends });
    } catch (error) {
        console.error("❌ Error fetching friends list:", error);
        res.status(500).json({ message: "Error fetching friends list", error: error.message });
    }
};

module.exports = { searchUsers, toggleFriend, getFriendsList };