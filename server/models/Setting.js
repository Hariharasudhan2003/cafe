import mongoose from 'mongoose';

const settingSchema = new mongoose.Schema(
  {
    cafeName: { type: String, default: 'BrewMaster' },
    branchLocation: { type: String, default: 'Downtown Branch' },
    contactNumber: { type: String, default: '+1 (555) 123-4567' },
    globalGst: { type: Number, default: 18 },
    taxInclusive: { type: Boolean, default: true },
    themeMode: { type: String, enum: ['Light', 'Dark'], default: 'Light' },
    logoUrl: { type: String, default: '' }
  },
  { timestamps: true }
);

export const Setting = mongoose.model('Setting', settingSchema);
