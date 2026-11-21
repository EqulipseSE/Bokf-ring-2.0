import { NextResponse } from "next/server";
import { completeBankLink } from "@/lib/bank-sync";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const back = new URL("/klientforetag", url.origin);
  if (error || !code || !state) {
    back.searchParams.set("bankfel", "Bankkopplingen avbröts.");
    return NextResponse.redirect(back);
  }
  const result = await completeBankLink(code, state);
  if (!result.ok) {
    back.searchParams.set("bankfel", result.error);
    return NextResponse.redirect(back);
  }
  back.searchParams.set("bank", "kopplad");
  return NextResponse.redirect(back);
}
