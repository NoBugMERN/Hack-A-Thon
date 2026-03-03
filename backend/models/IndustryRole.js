const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  category: { type: String },
  demandScore: { type: Number },
  avgSalary: { type: Object },
  topCompanies: [{ type: String }],
  requiredSkills: [{ type: mongoose.Schema.Types.Mixed }]
}, { strict: false });

module.exports = mongoose.model('IndustryRole', roleSchema);