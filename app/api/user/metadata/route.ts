import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

interface UserDoc {
  _id?: ObjectId;
  userEmail: string;
  lastLogin: Date;
  totalReads: number;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userEmail = session.user.email;
  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB_NAME || "kofa");
  const coll = db.collection<UserDoc>("users");
  let user = await coll.findOne({ userEmail });

  if (!user) {
    const now = new Date();
    const newUser: UserDoc = { userEmail, lastLogin: now, totalReads: 0 };
    const insertRes = await coll.insertOne(newUser);
    user = { _id: insertRes.insertedId, ...newUser };
  }

  return NextResponse.json({
    lastLogin: user.lastLogin,
    totalReads: user.totalReads,
  });
}

// NEW: bump totalReads by 1 and return updated stats
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userEmail = session.user.email;
  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB_NAME || "kofa");
  const coll = db.collection<UserDoc>("users");

  const updatedUser = await coll.findOneAndUpdate(
    { userEmail },
    { $inc: { totalReads: 1 } },
    { returnDocument: "after", upsert: true }
  );
  if (!updatedUser) {
    throw new Error("Failed to update user metadata");
  }
  const updated = updatedUser;

  return NextResponse.json({
    lastLogin: updated.lastLogin,
    totalReads: updated.totalReads,
  });
}