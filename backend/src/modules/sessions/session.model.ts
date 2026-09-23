import { Schema, model, type InferSchemaType } from "mongoose";
import type { RegistrationStatusValue, SessionStatusValue } from "./session.types";

const registrationSchema = new Schema(
  {
    phone: { type: String, required: true, trim: true },
    status: {
      type: String,
      required: true,
      enum: ["registered", "waitlist"] satisfies RegistrationStatusValue[],
    },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const sessionSchema = new Schema(
  {
    gameCode: { type: String, required: true, trim: true },
    date: { type: String, required: true },
    slot: { type: String, required: true, trim: true },
    maxPlayers: { type: Number, required: true, min: 2, max: 30 },
    hostName: { type: String, required: true, trim: true, maxlength: 20 },
    hostContact: { type: String, required: true, trim: true },
    note: { type: String, default: "", maxlength: 200 },
    status: {
      type: String,
      required: true,
      enum: ["open", "closed"] satisfies SessionStatusValue[],
      default: "open",
    },
    registrations: { type: [registrationSchema], default: [] },
  },
  { timestamps: true }
);

// 同一场组局（同一文档）内手机号唯一，保证一人一位；跨场次不受影响
sessionSchema.index({ _id: 1, "registrations.phone": 1 }, { unique: true });
sessionSchema.index({ date: 1, slot: 1 });

export type SessionDocument = InferSchemaType<typeof sessionSchema> & {
  _id: unknown;
  createdAt: Date;
  updatedAt: Date;
};

export const SessionModel = model("Session", sessionSchema);
