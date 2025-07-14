import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userEmail = session.user.email;

  const today = new Date().toISOString().slice(0, 10);
  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB_NAME || "kofa");
  const coll = db.collection("users");

  const result = await coll.findOneAndUpdate(
    { userEmail },
    [
      {
        $set: {
          dailyReads: {
            date: today,
            count: {
              $cond: [
                { $eq: ["$dailyReads.date", today] },
                { $add: ["$dailyReads.count", 1] },
                1
              ]
            }
          }
        }
      }
    ],
    { returnDocument: "after", upsert: true }
  );
  const updated = result.value!;
  const subscriptionStatus = updated.subscriptionStatus || "inactive";
  const count = updated.dailyReads.count;
  const remaining =
    subscriptionStatus === "active" ? Infinity : Math.max(0, 3 - count);

  return NextResponse.json({ remaining, subscriptionStatus });
}