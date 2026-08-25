import { Setting } from '../models/Setting.js';

export const getSettings = async (req, res) => {
  try {
    let settings = await Setting.findOne();
    if (!settings) {
      settings = await Setting.create({
        cafeName: 'BrewMaster',
        branchLocation: 'Downtown Branch',
        contactNumber: '+1 (555) 123-4567',
        globalGst: 18,
        taxInclusive: true,
        themeMode: 'Light'
      });
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateSettings = async (req, res) => {
  try {
    let settings = await Setting.findOne();
    if (settings) {
      settings = await Setting.findByIdAndUpdate(settings._id, req.body, { new: true });
    } else {
      settings = await Setting.create(req.body);
    }
    res.json(settings);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
