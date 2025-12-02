// models/indicatorSchema.js - CREATE THIS FILE
import mongoose from "mongoose";

const indicatorSchema = new mongoose.Schema({
  indicatorId: { type: String, required: true },
  domain: { type: String, required: true },
  question: { type: String, required: true },
  answerType: {
    type: String,
    enum: ["yes_no", "percentage"],
    required: true
  },
  answer: { type: String, enum: ["yes", "no"], default: null },
  percentage: { type: Number, default: null },
  score: {
    type: Number,
    min: 0,
    max: 2,
    default: 0,
    required: true
  },
  remark: { type: String }
});

export default indicatorSchema;
