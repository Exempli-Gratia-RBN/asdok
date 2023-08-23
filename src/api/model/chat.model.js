const mongoose = require("mongoose");

const ChatSchema = new mongoose.Schema(
  {
    patient_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    content: {
      type: Array,
      required: true,
    },
    doctors: {
      type: Array,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

exports.ChatModel = mongoose.model("chat", ChatSchema);
