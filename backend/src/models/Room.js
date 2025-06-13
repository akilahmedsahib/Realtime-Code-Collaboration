const mongoose = require("mongoose");

const RoomSchema = new mongoose.Schema({
    roomId: { type: String, required: true, unique: true },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Room", RoomSchema);
