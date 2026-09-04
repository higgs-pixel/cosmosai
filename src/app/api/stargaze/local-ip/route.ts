import { NextResponse } from "next/server";
import os from "os";

export async function GET() {
  let localIp = "localhost";
  const nets = os.networkInterfaces();

  for (const name of Object.keys(nets)) {
    const netList = nets[name];
    if (!netList) continue;
    for (const net of netList) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (net.family === "IPv4" && !net.internal) {
        localIp = net.address;
        break;
      }
    }
    if (localIp !== "localhost") break;
  }

  return NextResponse.json({ ip: localIp });
}
