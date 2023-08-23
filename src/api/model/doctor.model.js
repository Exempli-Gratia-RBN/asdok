const mongoose = require("mongoose");

const DoctorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      required: true,
    },
    specialize: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// export default DoctorModel = mongoose.model("doctor", DoctorSchema);
exports.DoctorModel = mongoose.model("doctor", DoctorSchema);
